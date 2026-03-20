import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
  ) {}

  async findAll() {
    return this.currencyRepo.find({ order: { isBase: 'DESC', code: 'ASC' } });
  }

  async findOne(id: string) {
    const cur = await this.currencyRepo.findOne({ where: { id } });
    if (!cur) throw new NotFoundException('Devise non trouvée');
    return cur;
  }

  async create(dto: CreateCurrencyDto) {
    const existing = await this.currencyRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Le code devise existe déjà');
    
    // If setting as base, unset others
    if (dto.isBase) {
      await this.unsetBase();
    }

    const cur = this.currencyRepo.create(dto);
    return this.currencyRepo.save(cur);
  }

  async update(id: string, dto: UpdateCurrencyDto) {
    const cur = await this.findOne(id);
    
    if (dto.isBase && !cur.isBase) {
      await this.unsetBase();
    }

    Object.assign(cur, dto);
    return this.currencyRepo.save(cur);
  }

  async getBaseCurrency() {
    return this.currencyRepo.findOne({ where: { isBase: true, isActive: true } });
  }

  async convert(amount: number, fromCode: string, toCode: string): Promise<number> {
    const from = await this.currencyRepo.findOne({ where: { code: fromCode } });
    const to = await this.currencyRepo.findOne({ where: { code: toCode } });
    
    if (!from || !to) throw new NotFoundException('Devise source ou cible non trouvée');
    
    // amount in base
    const amountInBase = amount / Number(from.exchangeRate);
    // amount in target
    return amountInBase * Number(to.exchangeRate);
  }

  private async unsetBase() {
    await this.currencyRepo.update({}, { isBase: false });
  }

  async remove(id: string) {
    const cur = await this.findOne(id);
    if (cur.isBase) throw new ConflictException('Impossible de supprimer la devise de base');
    return this.currencyRepo.remove(cur);
  }
}
