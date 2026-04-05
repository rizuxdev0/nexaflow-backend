import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from '../products/entities/product.entity';
import { StockService } from '../stock/stock.service';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';


@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page?: number; pageSize?: number; status?: string; supplierId?: string }) {
    const { page = 1, pageSize = 20, status, supplierId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [data, total] = await this.poRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['supplier']
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const po = await this.poRepository.findOne({ 
      where: { id },
      relations: ['supplier']
    });
    if (!po) throw new NotFoundException('Bon de commande non trouvé');
    return po;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const supplier = await this.supplierRepository.findOne({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Fournisseur non trouvé');

    const poNumber = await this.generatePoNumber();
    const po = this.poRepository.create({
      ...dto,
      poNumber,
      status: PurchaseOrderStatus.DRAFT,
    });

    const saved = await this.poRepository.save(po);

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.CREATE,
      resource: 'PurchaseOrder',

      resourceId: saved.id,
      details: `Création bon de commande ${saved.poNumber} auprès de ${supplier.name}`
    });

    return saved;
  }

  async updateStatus(id: string, dto: UpdatePurchaseOrderStatusDto, userId?: string) {
    const po = await this.findOne(id);
    const oldStatus = po.status;

    if (oldStatus === PurchaseOrderStatus.RECEIVED || oldStatus === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Impossible de modifier un bon de commande terminé');
    }

    po.status = dto.status;
    const saved = await this.poRepository.save(po);

    await this.auditService.log({
      userId,
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'PurchaseOrder',

      resourceId: saved.id,
      details: `Statut bon de commande ${saved.poNumber} : ${oldStatus} → ${saved.status}`
    });

    return saved;
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto, userId?: string) {
    const po = await this.findOne(id);
    if (po.status === PurchaseOrderStatus.RECEIVED) throw new BadRequestException('Déjà reçu');

    // Update received quantities
    po.items = po.items.map(pItem => {
      const received = dto.items.find(dItem => dItem.productId === pItem.productId);
      if (received) {
        pItem.receivedQuantity += received.quantity;
      }
      return pItem;
    });

    // Check if partial or full
    const isFull = po.items.every(item => item.receivedQuantity >= item.quantity);
    po.status = isFull ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIAL;
    po.receivedDate = new Date();

    const saved = await this.poRepository.save(po);

    // Stock update logic for each received item
    for (const dItem of dto.items) {
      await this.stockService.createMovement({
        productId: dItem.productId,
        type: StockMovementType.PURCHASE,
        quantity: dItem.quantity,
        reason: `Réception bon de commande ${po.poNumber}`,
        reference: po.poNumber,
        userId: userId,
        warehouseId: dto.warehouseId
      });
    }

    await this.auditService.log({
      userId,
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'PurchaseOrder',

      resourceId: saved.id,
      details: `Réception ${isFull ? 'totale' : 'partielle'} du bon de commande ${po.poNumber}`
    });

    return saved;
  }

  async getSuggestions(userId?: string) {
    // 1. Identify products whose stock (current + pending) is below minStock
    // We need to account for products already being ordered (status draft, sent, confirmed, partial)
    const activePOs = await this.poRepository.createQueryBuilder('po')
      .where('po.status NOT IN (:...excluded)', { excluded: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED] })
      .getMany();

    const pendingQuantities = new Map<string, number>();
    activePOs.forEach(po => {
      po.items.forEach(item => {
        const currentPending = pendingQuantities.get(item.productId) || 0;
        const remainingToReceive = item.quantity - item.receivedQuantity;
        pendingQuantities.set(item.productId, currentPending + remainingToReceive);
      });
    });

    // 2. Fetch all products to check stock levels
    const allProducts = await this.productRepository.find({ relations: ['supplier'] });
    console.log(`[PO Suggestions] Analyzing ${allProducts.length} products...`);
    
    // Filter products that actually need replenishment
    const productsToOrder = allProducts.filter(p => {
      const stockVal = Number(p.stock) || 0;
      const minStockVal = Number(p.minStock) || 0;
      const pending = pendingQuantities.get(p.id) || 0;
      const virtualStock = stockVal + pending;

      const needsOrder = virtualStock <= minStockVal && !!p.supplierId;
      
      if (virtualStock <= minStockVal && !p.supplierId) {
        console.warn(`[PO Suggestions] Product ${p.name} (${p.sku}) is below threshold (${virtualStock}/${minStockVal}) but has NO supplier.`);
      }
      return needsOrder;
    });

    console.log(`[PO Suggestions] Found ${productsToOrder.length} products needing replenishment.`);

    if (productsToOrder.length === 0) return [];

    // 3. Group by supplier
    const ordersBySupplier = new Map<string, { supplierId: string, supplierName: string, items: any[] }>();
    
    for (const p of productsToOrder) {
      if (!p.supplierId) continue;
      
      const sid = p.supplierId;
      if (!ordersBySupplier.has(sid)) {
        ordersBySupplier.set(sid, { 
          supplierId: sid, 
          supplierName: p.supplier?.name || 'Fournisseur inconnu', 
          items: [] 
        });
      }

      const stockVal = Number(p.stock) || 0;
      const minStockVal = Number(p.minStock) || 0;
      const maxStockVal = Number(p.maxStock) || 100;
      const pending = pendingQuantities.get(p.id) || 0;
      const virtualStock = stockVal + pending;
      
      // Calculate quantity: fill up to maxStock, ensure it's at least minStock * 2 to justify the PO
      const baseReplenish = maxStockVal - virtualStock;
      const orderQty = Math.max(baseReplenish, minStockVal * 2);

      const grp = ordersBySupplier.get(sid);
      if (orderQty > 0 && grp) {
        grp.items.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          quantity: orderQty,
          unitCost: Number(p.costPrice) || 0,
          receivedQuantity: 0,
          total: orderQty * (Number(p.costPrice) || 0)
        });
      }
    }

    const createdOrders: PurchaseOrder[] = [];

    // 4. Create Draft Purchase Orders
    for (const group of Array.from(ordersBySupplier.values())) {
      if (group.items.length === 0) continue;

      const subtotal = group.items.reduce((acc, i) => acc + i.total, 0);
      const taxTotal = Math.round(subtotal * 0.18); // Example fixed tax for now
      const total = subtotal + taxTotal;

      const po = await this.create({
        supplierId: group.supplierId,
        items: group.items,
        subtotal,
        taxTotal,
        total,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // J+7
        isAutoGenerated: true,
        notes: 'Généré automatiquement — Analyse intelligente du stock bas',
      });
      createdOrders.push(po);
    }

    return createdOrders;
  }

  private async generatePoNumber(): Promise<string> {
    const date = new Date();
    const prefix = `PO-${date.getFullYear()}${ (date.getMonth() + 1).toString().padStart(2, '0') }`;
    const count = await this.poRepository.count();
    return `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
