import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomPackConfig } from './entities/custom-pack-config.entity';
import { CustomPackRequest } from './entities/custom-pack-request.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CustomPacksService implements OnModuleInit {
  constructor(
    @InjectRepository(CustomPackConfig)
    private readonly configRepo: Repository<CustomPackConfig>,
    @InjectRepository(CustomPackRequest)
    private readonly requestRepo: Repository<CustomPackRequest>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    // Initializer la config si elle n'existe pas
    const count = await this.configRepo.count();
    if (count === 0) {
      const config = this.configRepo.create({
        enabled: true,
        minProducts: 3,
        maxProducts: 10,
        requiresApproval: true,
        discountTiers: [
          { minProducts: 3, discountType: 'percentage', discountValue: 5 },
          { minProducts: 5, discountType: 'percentage', discountValue: 10 },
          { minProducts: 8, discountType: 'percentage', discountValue: 15 },
        ],
      });
      await this.configRepo.save(config);
    }
  }

  // --- Configuration ---
  async getConfig(): Promise<CustomPackConfig> {
    const config = await this.configRepo.findOne({ where: {} });
    if (!config) throw new NotFoundException('Config non trouvée');
    return config;
  }

  async updateConfig(id: string, data: Partial<CustomPackConfig>): Promise<CustomPackConfig> {
    const config = await this.getConfig();
    await this.configRepo.update(config.id, data);
    return this.getConfig();
  }

  // --- Demandes (Requests) ---
  async findAll(pagination: PaginationDto, status?: string, customerId?: string) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const query = this.requestRepo.createQueryBuilder('request');

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    if (customerId) {
      query.andWhere('request.customerId = :customerId', { customerId });
    }

    query.orderBy('request.createdAt', 'DESC');
    query.skip(skip).take(pageSize);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<CustomPackRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande non trouvée');
    return request;
  }

  async create(data: any): Promise<CustomPackRequest> {
    const request = this.requestRepo.create(data as object);
    const saved = await this.requestRepo.save(request as any);
    
    // Notify Admin
    this.notificationsService.notifyCustomPackUpdate(
      saved.id, 
      saved.customerName, 
      'pending', 
      undefined, 
      undefined // General admin notification
    ).catch(e => console.error('Failed to notify admin about pack request:', e));

    return saved;
  }

  async approve(id: string, adminNote?: string, adjustedDiscount?: any): Promise<CustomPackRequest> {
    const request = await this.findOne(id);
    request.status = 'approved';
    request.adminNote = adminNote || '';
    request.reviewedAt = new Date();
    
    if (adjustedDiscount) {
      request.discountType = adjustedDiscount.type;
      request.discountValue = adjustedDiscount.value;
      // Recalcule
      if (adjustedDiscount.type === 'percentage') {
        request.discountedTotal = Math.round(request.originalTotal * (1 - adjustedDiscount.value / 100));
      } else {
        request.discountedTotal = Math.max(0, request.originalTotal - adjustedDiscount.value);
      }
      request.savings = request.originalTotal - request.discountedTotal;
    }
    
    const saved = await this.requestRepo.save(request);

    // Notify Customer
    this.notificationsService.notifyCustomPackUpdate(
      saved.id,
      saved.customerName,
      'approved',
      saved.customerId, // userId of the shopper
      undefined
    ).catch(e => console.error('Failed to notify customer about pack approval:', e));

    return saved;
  }

  async reject(id: string, adminNote?: string): Promise<CustomPackRequest> {
    const request = await this.findOne(id);
    request.status = 'rejected';
    request.adminNote = adminNote || '';
    request.reviewedAt = new Date();
    const saved = await this.requestRepo.save(request);

    // Notify Customer
    this.notificationsService.notifyCustomPackUpdate(
      saved.id,
      saved.customerName,
      'rejected',
      saved.customerId,
      undefined
    ).catch(e => console.error('Failed to notify customer about pack rejection:', e));

    return saved;
  }

  async getPendingCount(): Promise<number> {
    return this.requestRepo.count({ where: { status: 'pending' } });
  }
}
