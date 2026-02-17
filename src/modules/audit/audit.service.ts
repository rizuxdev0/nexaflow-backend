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

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

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
  }): Promise<AuditLog> {
    const entry = this.auditRepository.create(data);
    return await this.auditRepository.save(entry);
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

    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.timestamp', 'DESC');

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (resource) {
      queryBuilder.andWhere('audit.resource = :resource', { resource });
    }

    if (userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }

  async getStats() {
    const total = await this.auditRepository.count();

    const byAction = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    const byResource = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.resource')
      .getRawMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.auditRepository.count({
      where: { timestamp: Between(today, new Date()) },
    });

    return {
      total,
      today: todayCount,
      byAction,
      byResource,
    };
  }
}
