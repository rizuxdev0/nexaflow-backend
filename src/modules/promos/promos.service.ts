import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';

@Injectable()
export class PromosService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promosRepository: Repository<PromoCode>,
  ) {}

  async getPromoCodes(page: number = 1, pageSize: number = 20) {
    const [data, total] = await this.promosRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createPromo(createPromoCodeDto: CreatePromoCodeDto): Promise<PromoCode> {
    const promo = this.promosRepository.create({
      ...createPromoCodeDto,
      code: createPromoCodeDto.code.toUpperCase()
    });
    return this.promosRepository.save(promo);
  }

  async updatePromo(id: string, updatePromoCodeDto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promo = await this.promosRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found');
    
    if (updatePromoCodeDto.code) {
      updatePromoCodeDto.code = updatePromoCodeDto.code.toUpperCase();
    }
    
    Object.assign(promo, updatePromoCodeDto);
    return this.promosRepository.save(promo);
  }

  async deletePromo(id: string): Promise<void> {
    const promo = await this.promosRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found');
    await this.promosRepository.remove(promo);
  }

  async validatePromo(code: string, orderTotal: number) {
    const promo = await this.promosRepository.findOne({ where: { code: code.toUpperCase() } });
    
    if (!promo) return { valid: false, discount: 0, message: 'Code promo invalide' };
    if (!promo.isActive) return { valid: false, discount: 0, message: 'Code promo désactivé' };
    
    const now = new Date();
    if (now < new Date(promo.startDate)) return { valid: false, discount: 0, message: 'Code promo pas encore actif' };
    if (now > new Date(promo.endDate)) return { valid: false, discount: 0, message: 'Code promo expiré' };
    
    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      return { valid: false, discount: 0, message: "Limite d'utilisation atteinte" };
    }
    
    if (orderTotal < promo.minOrderAmount) {
      return { valid: false, discount: 0, message: `Minimum: ${promo.minOrderAmount} FCFA` };
    }
    
    let discount = promo.type === 'percentage' 
      ? Math.round(orderTotal * promo.value / 100) 
      : promo.value;
      
    if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
      discount = promo.maxDiscountAmount;
    }
    
    return { 
      valid: true, 
      discount, 
      message: `${promo.type === 'percentage' ? `-${promo.value}%` : `-${promo.value} FCFA`} appliqué !`, 
      promo 
    };
  }

  async incrementUsage(id: string) {
    const promo = await this.promosRepository.findOne({ where: { id } });
    if (promo) {
      promo.usedCount += 1;
      await this.promosRepository.save(promo);
    }
  }
}
