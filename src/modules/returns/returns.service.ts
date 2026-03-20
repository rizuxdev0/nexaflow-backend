import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductReturn, ReturnStatus, ReturnReason } from './entities/return.entity';
import { CreateReturnDto, UpdateReturnStatusDto } from './dto/return.dto';
import { Order } from '../orders/entities/order.entity';
import { StockService } from '../stock/stock.service';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';


@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ProductReturn)
    private readonly returnRepository: Repository<ProductReturn>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page?: number; pageSize?: number; status?: string; search?: string }) {
    const { page = 1, pageSize = 20, status, search } = query;
    const qb = this.returnRepository.createQueryBuilder('ret')
      .leftJoinAndSelect('ret.order', 'order')
      .orderBy('ret.createdAt', 'DESC');

    if (status) qb.andWhere('ret.status = :status', { status });
    if (search) {
      qb.andWhere('(ret.returnNumber LIKE :search OR ret.customerName LIKE :search OR ret.orderId LIKE :search)', { search: `%${search}%` });
    }

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const ret = await this.returnRepository.findOne({ 
      where: { id },
      relations: ['order']
    });
    if (!ret) throw new NotFoundException('Retour non trouvé');
    return ret;
  }

  async create(dto: CreateReturnDto) {
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Commande non trouvée');

    const returnNumber = await this.generateReturnNumber();
    const ret = this.returnRepository.create({
      ...dto,
      returnNumber,
      status: ReturnStatus.PENDING,
      customerName: dto.customerName || order.customerName,
      customerId: dto.customerId || order.customerId
    });

    const saved = await this.returnRepository.save(ret);

    await this.auditService.log({
      userName: 'Client/Admin', // Should pass from context
      action: AuditAction.CREATE,
      resource: 'ProductReturn',

      resourceId: saved.id,
      details: `Demande de retour ${saved.returnNumber} créée pour la commande ${order.orderNumber}`
    });

    return saved;
  }

  async updateStatus(id: string, dto: UpdateReturnStatusDto, userId?: string) {
    const ret = await this.findOne(id);
    const oldStatus = ret.status;
    
    // Status transition validation
    if (oldStatus === ReturnStatus.REFUNDED || oldStatus === ReturnStatus.EXCHANGED) {
      throw new BadRequestException('Impossible de modifier un retour déjà traité');
    }

    if (dto.status === ReturnStatus.APPROVED && oldStatus === ReturnStatus.PENDING) {
      // Restocking logic if applicable
      for (const item of ret.items) {
        if (item.restockable) {
          await this.stockService.createMovement({
            productId: item.productId,
            type: StockMovementType.RETURN,
            quantity: item.quantity,
            reason: `Réintégration stock via retour ${ret.returnNumber}`,
            reference: ret.returnNumber,
            userId: userId
          });
        }
      }
    }

    ret.status = dto.status;
    if (dto.notes) {
      ret.notes = ret.notes ? `${ret.notes}\n[Update ${new Date().toISOString()}] ${dto.notes}` : `[Update ${new Date().toISOString()}] ${dto.notes}`;
    }
    if (dto.refundAmount) ret.refundAmount = dto.refundAmount;
    if (dto.refundMethod) ret.refundMethod = dto.refundMethod;
    
    ret.processedAt = new Date();
    ret.processedBy = userId || null;

    const saved = await this.returnRepository.save(ret);

    await this.auditService.log({
      userId,
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'ProductReturn',

      resourceId: saved.id,
      details: `Statut retour ${saved.returnNumber} mis à jour : ${oldStatus} → ${saved.status}`
    });

    return saved;
  }

  private async generateReturnNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const count = await this.returnRepository.count();
    const seq = (count + 1).toString().padStart(4, '0');
    return `RET-${year}${seq}`;
  }
}
