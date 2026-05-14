import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { AuditResponseDto } from './dto/audit-response.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class AuditService extends AbstractTenantService<AuditLog> {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
    tenantService: TenantService,
  ) {
    super(auditRepository, tenantService, 'AuditLog');
  }

  async log(data: {
    userId?: string;
    userName: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    details: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    vendorId?: string;
  }): Promise<AuditLog> {
    const entry = this.repo.create({
      ...data,
      vendorId: data.vendorId || this.tenantService.getVendorId() || undefined,
    });
    return await this.repo.save(entry);
  }

  /**
   * Calcule la différence entre deux objets pour l'audit
   */
  calculateDiff(oldData: any, newData: any): { oldDiff: any; newDiff: any } {
    if (!oldData || !newData) return { oldDiff: oldData, newDiff: newData };
    
    const oldDiff: any = {};
    const newDiff: any = {};

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      // Ignore les champs internes typeORM qui changent souvent automatiquement
      if (key === 'updatedAt' || key === 'createdAt' || key === 'vendorId') return;

      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        oldDiff[key] = oldData[key];
        newDiff[key] = newData[key];
      }
    });

    return { oldDiff, newDiff };
  }

  /**
   * Enregistre un log avec un diff calculé automatiquement
   */
  async logUpdateWithDiff(
    baseData: {
      userId?: string;
      userName: string;
      resource: string;
      resourceId?: string;
      details: string;
      ipAddress?: string;
      userAgent?: string;
      vendorId?: string;
    },
    oldData: any,
    newData: any
  ): Promise<AuditLog | null> {
    const { oldDiff, newDiff } = this.calculateDiff(oldData, newData);

    // Ne rien loguer si aucune vraie différence n'est détectée
    if (Object.keys(newDiff).length === 0) {
      return null;
    }

    return this.log({
      ...baseData,
      action: AuditAction.UPDATE,
      oldData: oldDiff,
      newData: newDiff,
    });
  }

  async findAll(
    filterDto: AuditFilterDto,
  ): Promise<PaginatedResponse<AuditResponseDto>> {
    const {
      page = 1,
      pageSize = 50,
      action,
      resource,
      userId,
      startDate,
      endDate,
    } = filterDto;

    const queryBuilder = this.repo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.timestamp', 'DESC');

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (resource) {
      queryBuilder.andWhere('audit.resource ILIKE :resource', { resource: `%${resource}%` });
    }

    if (userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }

  async getStats() {
    const total = await this.repo.count();

    const byAction = await this.repo
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    const byResource = await this.repo
      .createQueryBuilder('audit')
      .select('audit.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.resource')
      .getRawMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.repo.count({
      where: { timestamp: Between(today, new Date()) } as any,
    });

    return {
      total,
      today: todayCount,
      byAction,
      byResource,
    };
  }
}
