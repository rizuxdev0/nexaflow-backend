import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ProductBundle } from './entities/package.entity';
import { CreatePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(ProductBundle)
    private readonly bundleRepository: Repository<ProductBundle>,
  ) {}

  async findAll(query: { active?: boolean; page?: number; pageSize?: number }) {
    const { active, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (active !== undefined) where.isActive = active;

    const [data, total] = await this.bundleRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' }
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const bundle = await this.bundleRepository.findOne({ where: { id } });
    if (!bundle) throw new NotFoundException('Pack non trouvé');
    return bundle;
  }

  async findBySlug(slug: string) {
    const bundle = await this.bundleRepository.findOne({ where: { slug, isActive: true } });
    if (!bundle) throw new NotFoundException('Pack non trouvé');
    return bundle;
  }

  private sanitizeItems(items: any[]): any[] {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(i => i && typeof i === 'object' && !Array.isArray(i) && i.productId);
  }

  async create(dto: CreatePackageDto) {
    const existing = await this.bundleRepository.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Ce slug est déjà utilisé');

    const bundle = this.bundleRepository.create({
      ...dto,
      items: this.sanitizeItems(dto.items),
      originalPrice: Number(dto.originalPrice) || 0,
      bundlePrice: Number(dto.bundlePrice) || 0,
    });
    return this.bundleRepository.save(bundle);
  }

  async update(id: string, dto: Partial<CreatePackageDto>) {
    const bundle = await this.findOne(id);
    const sanitized = {
      ...dto,
      items: dto.items ? this.sanitizeItems(dto.items) : undefined,
      originalPrice: dto.originalPrice !== undefined ? Number(dto.originalPrice) || 0 : undefined,
      bundlePrice: dto.bundlePrice !== undefined ? Number(dto.bundlePrice) || 0 : undefined,
    };
    Object.assign(bundle, sanitized);
    return this.bundleRepository.save(bundle);
  }

  async remove(id: string) {
    const bundle = await this.findOne(id);
    return this.bundleRepository.remove(bundle);
  }
}
