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

  async autoGenerate(userId?: string) {
    // Generate suggestions based on minStock
    const lowStockProducts = await this.productRepository.find({
      where: {
        stock: LessThanOrEqual(0) // wait, actually should be LessThan(minStock)
      },
      relations: ['supplier']
    });
    // For now, simpler: all below minStock
    // Actually, I'll use query builder or a loop
    const productsToOrder = await this.productRepository
        .createQueryBuilder('p')
        .where('p.stock <= p.minStock')
        .getMany();

    if (productsToOrder.length === 0) return { message: 'Aucun produit en rupture de stock critique' };

    // Group by supplier
    const ordersBySupplier = new Map<string, any[]>();
    productsToOrder.forEach(p => {
      if (p.supplierId) {
        if (!ordersBySupplier.has(p.supplierId)) ordersBySupplier.set(p.supplierId, []);
        ordersBySupplier.get(p.supplierId)!.push(p);
      }
    });

    const createdOrders: PurchaseOrder[] = [];

    for (const [supplierId, products] of ordersBySupplier.entries()) {
      const items = products.map(p => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantity: p.maxStock - p.stock,
        unitCost: Number(p.costPrice),
        receivedQuantity: 0,
        total: (p.maxStock - p.stock) * Number(p.costPrice)
      }));

      const subtotal = items.reduce((acc, i) => acc + i.total, 0);
      const taxTotal = subtotal * 0.18;
      const total = subtotal + taxTotal;

      const po = await this.create({
        supplierId,
        items,
        subtotal,
        taxTotal,
        total,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // J+7
        isAutoGenerated: true,
      });
      createdOrders.push(po);
    }

    return { createdCount: createdOrders.length, orders: createdOrders };
  }

  private async generatePoNumber(): Promise<string> {
    const date = new Date();
    const prefix = `PO-${date.getFullYear()}${ (date.getMonth() + 1).toString().padStart(2, '0') }`;
    const count = await this.poRepository.count();
    return `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
