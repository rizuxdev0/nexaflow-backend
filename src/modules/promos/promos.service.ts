import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PromoCode, PromoType } from './entities/promo.entity';
import { CreatePromoDto, ValidatePromoDto } from './dto/promo.dto';

@Injectable()
export class PromosService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepository: Repository<PromoCode>,
  ) {}

  async findAll(query: { active?: boolean; page?: number; pageSize?: number }) {
    const { active, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (active !== undefined) where.isActive = active;

    const [data, total] = await this.promoRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' }
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const promo = await this.promoRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo non trouvé');
    return promo;
  }

  async findByCode(code: string) {
    return this.promoRepository.findOne({ where: { code, isActive: true } });
  }

  async validateCode(dto: ValidatePromoDto) {
    const promo = await this.findByCode(dto.code);
    if (!promo) throw new BadRequestException('Code invalide ou expiré');

    const now = new Date();
    if (now < promo.startDate || now > promo.endDate) {
      throw new BadRequestException('Ce code n\'est pas actif actuellement');
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

    // Logic for applicableProducts and applicableCategories should be handled in checkout?
    // Usually, we return the promo details and the frontend/checkout-service applies it.
    
    let discountAmount = 0;
    if (promo.type === PromoType.PERCENTAGE) {
      discountAmount = (dto.orderAmount * Number(promo.value)) / 100;
      if (promo.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, Number(promo.maxDiscountAmount));
      }
    } else {
      discountAmount = Number(promo.value);
    }

    return { isValid: true, discountAmount, promo };
  }

  async incrementUsage(id: string) {
    const promo = await this.findOne(id);
    promo.usedCount += 1;
    return this.promoRepository.save(promo);
  }

  async create(dto: CreatePromoDto) {
    const existing = await this.promoRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('Ce code existe déjà');

    const promo = this.promoRepository.create(dto);
    return this.promoRepository.save(promo);
  }

  async update(id: string, dto: Partial<CreatePromoDto>) {
    const promo = await this.findOne(id);
    Object.assign(promo, dto);
    return this.promoRepository.save(promo);
  }

  async remove(id: string) {
    const promo = await this.findOne(id);
    return this.promoRepository.remove(promo);
  }

  async generatePersonalizedCode(customer: { firstName: string; lastName: string }) {
    const initials = (customer.firstName[0] + (customer.lastName[0] || '')).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000); // 4 chiffres aléatoires
    const code = `${initials}${random}`;
    
    // Vérifier l'unicité
    const existing = await this.promoRepository.findOne({ where: { code } });
    if (existing) return this.generatePersonalizedCode(customer); // Réessayer si existe
    
    return code;
  }
}
