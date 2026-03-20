import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryCount, InventoryCountStatus, InventoryCountItem } from './entities/inventory.entity';
import { CreateInventoryDto, UpdateInventoryStatusDto, UpdateInventoryItemsDto } from './dto/inventory.dto';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { StockService } from '../stock/stock.service';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(InventoryCount)
    private readonly inventoryRepository: Repository<InventoryCount>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page?: number; pageSize?: number; status?: string; warehouseId?: string }) {
    const { page = 1, pageSize = 20, status, warehouseId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const [data, total] = await this.inventoryRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['warehouse']
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const inv = await this.inventoryRepository.findOne({ 
      where: { id },
      relations: ['warehouse']
    });
    if (!inv) throw new NotFoundException('Inventaire non trouvé');
    return inv;
  }

  async create(dto: CreateInventoryDto) {
    const warehouse = await this.warehouseRepository.findOne({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException('Entrepôt non trouvé');

    const reference = await this.generateReference();
    const inv = this.inventoryRepository.create({
      ...dto,
      reference,
      status: InventoryCountStatus.PLANNED,
    });

    const saved = await this.inventoryRepository.save(inv);

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.CREATE,
      resource: 'InventoryCount',
      resourceId: saved.id,
      details: `Planification inventaire ${saved.reference} pour ${warehouse.name}`
    });

    return saved;
  }

  async autoGenerate(warehouseId: string) {
    const warehouse = await this.warehouseRepository.findOne({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException('Entrepôt non trouvé');

    // For a generic "all products" inventory
    const products = await this.productRepository.find();
    const items: InventoryCountItem[] = products.map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      expectedQuantity: p.stock,
      countedQuantity: p.stock, // Default to expected
      variance: 0
    }));

    return this.create({
      warehouseId,
      scheduledDate: new Date(),
      items,
      notes: 'Inventaire auto-généré (tout le stock)'
    });
  }

  async updateItems(id: string, dto: UpdateInventoryItemsDto) {
    const inv = await this.findOne(id);
    if (inv.status === InventoryCountStatus.COMPLETED) {
      throw new BadRequestException('Impossible de modifier un inventaire terminé');
    }

    inv.items = dto.items;
    inv.totalVariance = dto.items.reduce((acc, i) => acc + i.variance, 0);
    
    if (inv.status === InventoryCountStatus.PLANNED) {
      inv.status = InventoryCountStatus.IN_PROGRESS;
    }

    return this.inventoryRepository.save(inv);
  }

  async updateStatus(id: string, dto: UpdateInventoryStatusDto, userId?: string) {
    const inv = await this.findOne(id);
    const oldStatus = inv.status;

    if (oldStatus === InventoryCountStatus.COMPLETED) {
      throw new BadRequestException('Déjà terminé');
    }

    if (dto.status === InventoryCountStatus.COMPLETED) {
      // Validate items have been counted
      // In a real app, logic would adjust stock for variances
      for (const item of inv.items) {
        if (item.variance !== 0) {
          await this.stockService.createMovement({
            productId: item.productId,
            type: StockMovementType.ADJUSTMENT,
            quantity: Math.abs(item.variance),
            reason: `Ajustement via inventaire ${inv.reference}`,
            reference: inv.reference,
            warehouseId: inv.warehouseId,
            userId: userId
          });
        }
      }
      inv.completedDate = new Date();
      inv.countedBy = userId || null;
    }

    inv.status = dto.status;
    const saved = await this.inventoryRepository.save(inv);

    await this.auditService.log({
      userId,
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'InventoryCount',
      resourceId: saved.id,
      details: `Statut inventaire ${saved.reference} : ${oldStatus} → ${saved.status}. Variance totale : ${inv.totalVariance}`
    });


    return saved;
  }

  private async generateReference(): Promise<string> {
    const date = new Date();
    const prefix = `INV-${date.getFullYear()}${ (date.getMonth() + 1).toString().padStart(2, '0') }`;
    const count = await this.inventoryRepository.count();
    return `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
