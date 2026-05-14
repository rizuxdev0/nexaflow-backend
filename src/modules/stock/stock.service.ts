import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class StockService extends AbstractTenantService<StockMovement> {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    tenantService: TenantService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {
    super(movementRepository, tenantService, 'StockMovement');
  }

  private get productsRepo() { return this.tenantRepo(this.productRepository); }

  async createMovement(data: {
    productId: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    reference?: string;
    warehouseId?: string;
    userId?: string;
    allowNegative?: boolean;
  }) {
    const product = await this.productsRepo.findOne({
      where: { id: data.productId },
    });
    if (!product) throw new NotFoundException('Produit non trouvé');

    const oldStock = Number(product.stock);
    let newStock = oldStock;

    if ([StockMovementType.IN, StockMovementType.RETURN, StockMovementType.PURCHASE].includes(data.type)) {
      newStock += data.quantity;
    } else {
      newStock -= data.quantity;
      if (!data.allowNegative && newStock < 0) {
        throw new BadRequestException(`Stock insuffisant pour ${product.name} : ${oldStock} disponible, ${data.quantity} demandé`);
      }
    }

    // Update product stock (via proxied repo)
    product.stock = newStock;
    await this.productsRepo.save(product);

    // Record movement
    const movement = this.repo.create({
      ...data,
      oldStock,
      newStock,
      vendorId: this.tenantService.getVendorId() || product.vendorId,
    });
    const saved = await this.repo.save(movement);

    // Alert if stock is too low
    if (newStock < (product.minStock || 10)) {
      await this.notificationsService.notifyLowStock(product.name, product.sku, newStock);
      this.chatGateway.emitLowStock({ name: product.name, sku: product.sku, stock: newStock });
    }

    // Log audit
    await this.auditService.log({
      userId: data.userId,
      userName: 'Système',
      action: AuditAction.UPDATE,
      resource: 'Stock',
      resourceId: product.id,
      details: `Changement stock ${product.name} (${product.sku}) : ${oldStock} → ${newStock} (${[StockMovementType.IN, StockMovementType.RETURN, StockMovementType.PURCHASE].includes(data.type) ? '+' : '-'}${data.quantity}). Raison : ${data.reason}`,
      vendorId: movement.vendorId,
    });

    return saved;
  }

  async getMovements(productId?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (productId) where.productId = productId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' } as any,
      relations: ['product', 'user', 'warehouse']
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMovementsChartData(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.repo.find({
      where: {
        createdAt: Between(startDate, new Date())
      } as any,
      order: { createdAt: 'ASC' } as any
    });

    const chartMap = new Map<string, { in: number; out: number }>();
    
    movements.forEach(m => {
      const date = m.createdAt.toISOString().split('T')[0];
      if (!chartMap.has(date)) {
        chartMap.set(date, { in: 0, out: 0 });
      }
      const entry = chartMap.get(date)!;
      if ([StockMovementType.IN, StockMovementType.RETURN, StockMovementType.PURCHASE].includes(m.type)) {
        entry.in += m.quantity;
      } else {
        entry.out += m.quantity;
      }
    });

    return Array.from(chartMap.entries()).map(([date, values]) => ({
      date,
      in: values.in,
      out: values.out
    }));
  }
}
