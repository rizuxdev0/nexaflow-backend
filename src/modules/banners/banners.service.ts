import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Brackets } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class BannersService extends AbstractTenantService<Banner> {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    tenantService: TenantService,
  ) {
    super(bannerRepository, tenantService, 'Banner');
  }

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = this.repo.create({
      ...createBannerDto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    const saved = await this.repo.save(banner);
    await (this.cacheManager as any).clear();
    return saved;
  }

  async findAll(): Promise<Banner[]> {
    return this.repo.find({
      order: { priority: 'ASC', createdAt: 'DESC' } as any,
    });
  }

  async getActive(position?: string): Promise<Banner[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const query = this.repo.createQueryBuilder('banner')
      .where('banner.isActive = :isActive', { isActive: true })
      .andWhere(new Brackets(qb => {
        qb.where('banner.startDate IS NULL')
          .orWhere('banner.startDate <= :today', { today });
      }))
      .andWhere(new Brackets(qb => {
        qb.where('banner.endDate IS NULL')
          .orWhere('banner.endDate >= :today', { today });
      }));

    if (position) {
      query.andWhere('banner.position = :position', { position });
    }

    query.orderBy('banner.priority', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Banner> {
    return super.findOne(id);
  }

  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);
    Object.assign(banner, updateBannerDto);
    const saved = await this.repo.save(banner);
    await (this.cacheManager as any).clear();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await super.remove(id);
    await (this.cacheManager as any).clear();
  }

  async toggleActive(id: string): Promise<Banner> {
    const banner = await this.findOne(id);
    banner.isActive = !banner.isActive;
    const saved = await this.repo.save(banner);
    await (this.cacheManager as any).clear();
    return saved;
  }
}
