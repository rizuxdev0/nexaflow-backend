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
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class ReturnsService extends AbstractTenantService<ProductReturn> {
  constructor(
    @InjectRepository(ProductReturn)
    private readonly returnRepository: Repository<ProductReturn>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
    tenantService: TenantService,
  ) {
    super(returnRepository, tenantService, 'ProductReturn');
  }

  private get orderRepo() {
    return this.tenantService.tenantRepo(this.orderRepository);
  }

  async findAll(query: { page?: number; pageSize?: number; status?: string; search?: string }) {
    const { page = 1, pageSize = 20, status, search } = query;
    const qb = this.repo.createQueryBuilder('ret')
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
    const ret = await this.repo.findOne({ 
      where: { id },
      relations: ['order']
    });
    if (!ret) throw new NotFoundException('Retour non trouvé');
    return ret;
  }

  async findByCustomer(customerId: string) {
    return this.repo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      relations: ['order']
    });
  }

  async create(dto: CreateReturnDto) {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Commande non trouvée');

    const returnNumber = await this.generateReturnNumber();
    const ret = this.repo.create({
      ...dto,
      returnNumber,
      status: ReturnStatus.PENDING,
      customerName: dto.customerName || order.customerName,
      customerId: dto.customerId || order.customerId,
      vendorId: this.tenantService.getVendorId() || undefined,
    });

    const saved = await this.repo.save(ret);

    await this.auditService.log({
      userName: 'Client/Admin',
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
    
    if (oldStatus === ReturnStatus.REFUNDED || oldStatus === ReturnStatus.EXCHANGED) {
      throw new BadRequestException('Impossible de modifier un retour déjà traité');
    }

    if (dto.status === ReturnStatus.APPROVED && oldStatus === ReturnStatus.PENDING) {
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

    const saved = await this.repo.save(ret);

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
    const count = await this.repo.count();
    const seq = (count + 1).toString().padStart(4, '0');
    return `RET-${year}${seq}`;
  }
}
