import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Brackets } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepository.create(createBannerDto);
    const saved = await this.bannerRepository.save(banner);
    await (this.cacheManager as any).clear();
    return saved;
  }

  async findAll(): Promise<Banner[]> {
    return this.bannerRepository.find({
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
  }

  async getActive(position?: string): Promise<Banner[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const query = this.bannerRepository.createQueryBuilder('banner')
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
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Bannière avec l'ID ${id} introuvable`);
    }
    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);
    Object.assign(banner, updateBannerDto);
    const saved = await this.bannerRepository.save(banner);
    await (this.cacheManager as any).clear();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannerRepository.remove(banner);
    await (this.cacheManager as any).clear();
  }

  async toggleActive(id: string): Promise<Banner> {
    const banner = await this.findOne(id);
    banner.isActive = !banner.isActive;
    const saved = await this.bannerRepository.save(banner);
    await (this.cacheManager as any).clear();
    return saved;
  }
}
