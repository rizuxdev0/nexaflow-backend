import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PromoCode, PromoType } from './entities/promo.entity';
import { CreatePromoDto, ValidatePromoDto } from './dto/promo.dto';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class PromosService extends AbstractTenantService<PromoCode> {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepository: Repository<PromoCode>,
    tenantService: TenantService,
  ) {
    super(promoRepository, tenantService, 'PromoCode');
  }

  async findAll(query: { active?: boolean; page?: number; pageSize?: number }) {
    const { active, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (active !== undefined) where.isActive = active;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' } as any
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    return super.findOne(id);
  }

  async findByCode(code: string) {
    const trimmedCode = code.trim();
    return this.repo
      .createQueryBuilder('promo')
      .where('LOWER(promo.code) = LOWER(:code)', { code: trimmedCode })
      .getOne();
  }

  async validateCode(dto: ValidatePromoDto) {
    const promo = await this.findByCode(dto.code);
    
    if (!promo) {
      throw new BadRequestException(`Le code "${dto.code}" n'existe pas.`);
    }

    if (!promo.isActive) {
      throw new BadRequestException('Ce code promo a été désactivé.');
    }

    const now = new Date();
    if (promo.startDate && now < new Date(promo.startDate)) {
      throw new BadRequestException(`Ce code ne sera actif qu'à partir du ${new Date(promo.startDate).toLocaleDateString()}`);
    }
    if (promo.endDate && now > new Date(promo.endDate)) {
      throw new BadRequestException('Ce code a expiré.');
    }

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('La limite d\'utilisation de ce code a été atteinte');
    }

    if (dto.orderAmount < promo.minOrderAmount) {
      throw new BadRequestException(`Ce code nécessite un montant minimum de ${promo.minOrderAmount}`);
    }

    if (promo.customerId && promo.customerId !== dto.customerId) {
      throw new ForbiddenException('Ce code promo est réservé à un autre client');
    }
    
    let discountAmount = 0;
    if (promo.type === PromoType.PERCENTAGE) {
      discountAmount = (dto.orderAmount * Number(promo.value)) / 100;
      if (promo.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, Number(promo.maxDiscountAmount));
      }
    } else {
      discountAmount = Number(promo.value);
    }

    return { valid: true, discount: discountAmount, promo };
  }

  async incrementUsage(id: string) {
    const promo = await this.findOne(id);
    promo.usedCount += 1;
    return this.repo.save(promo);
  }

  async create(dto: CreatePromoDto) {
    const existing = await this.repo.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('Ce code existe déjà');

    // Nettoyage des champs UUID vides
    if (dto.customerId === '') dto.customerId = undefined;

    const promo = this.repo.create({
      ...dto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return this.repo.save(promo);
  }

  async update(id: string, dto: Partial<CreatePromoDto>) {
    const promo = await this.findOne(id);
    
    // Nettoyage des champs UUID vides
    if (dto.customerId === '') dto.customerId = undefined;

    Object.assign(promo, dto);
    return this.repo.save(promo);
  }

  async remove(id: string) {
    return super.remove(id);
  }

  async generatePersonalizedCode(customer: { firstName: string; lastName: string }): Promise<string> {
    const initials = (customer.firstName[0] + (customer.lastName[0] || '')).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000); // 4 chiffres aléatoires
    const code = `${initials}${random}`;
    
    // Vérifier l'unicité
    const existing = await this.repo.findOne({ where: { code } });
    if (existing) return this.generatePersonalizedCode(customer); // Réessayer si existe
    
    return code;
  }
}
