import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';


@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly auditService: AuditService,
  ) {}

  async createMovement(data: {
    productId: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    reference?: string;
    warehouseId?: string;
    userId?: string;
  }) {
    const product = await this.productRepository.findOne({ where: { id: data.productId } });
    if (!product) throw new NotFoundException('Produit non trouvé');

    const oldStock = product.stock;
    let newStock = oldStock;

    if (data.type === StockMovementType.IN || data.type === StockMovementType.RETURN || data.type === StockMovementType.PURCHASE) {
      newStock += data.quantity;
    } else {
      newStock -= data.quantity;
      if (newStock < 0) {
        throw new BadRequestException(`Stock insuffisant pour ${product.name} : ${oldStock} disponible, ${data.quantity} demandé`);
      }
    }

    // Update product stock
    product.stock = newStock;
    await this.productRepository.save(product);

    // Record movement
    const movement = this.movementRepository.create({
      ...data,
      oldStock,
      newStock,
    });
    const saved = await this.movementRepository.save(movement);

    // Log audit
    await this.auditService.log({
      userId: data.userId,
      userName: 'Système', // In real, should pass user name
      action: AuditAction.UPDATE,
      resource: 'Stock',

      resourceId: product.id,
      details: `Changement stock ${product.name} (${product.sku}) : ${oldStock} → ${newStock} (${data.type === StockMovementType.IN ? '+' : '-'}${data.quantity}). Raison : ${data.reason}`
    });

    return saved;
  }

  async getMovements(productId?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (productId) where.productId = productId;

    const [data, total] = await this.movementRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['product', 'user', 'warehouse']
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMovementsChartData(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.movementRepository.find({
      where: {
        createdAt: Between(startDate, new Date())
      },
      order: { createdAt: 'ASC' }
    });

    // Strategy: group by date?
    // Frontend expects daily totals for 'in' and 'out'
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
