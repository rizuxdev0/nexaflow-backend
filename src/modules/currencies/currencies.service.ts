import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Not } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class CurrenciesService implements OnModuleInit {
  constructor(
    @InjectRepository(Currency)
    private currenciesRepository: Repository<Currency>,
  ) {}

  // Initialisation : créer les devises par défaut si la table est vide
  async onModuleInit() {
    const count = await this.currenciesRepository.count();
    if (count === 0) {
      await this.seedDefaultCurrencies();
    }
  }

  private async seedDefaultCurrencies() {
    const defaultCurrencies = [
      {
        code: 'XOF',
        name: 'Franc CFA',
        symbol: 'FCFA',
        rate: 1,
        isDefault: true,
        isActive: true,
      },
      {
        code: 'XAF',
        name: 'Franc CFA BEAC',
        symbol: 'FCFA',
        rate: 1,
        isDefault: false,
        isActive: true,
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        rate: 655.957, // Taux approximatif
        isDefault: false,
        isActive: true,
      },
      {
        code: 'USD',
        name: 'Dollar US',
        symbol: '$',
        rate: 605.5, // Taux approximatif
        isDefault: false,
        isActive: true,
      },
      {
        code: 'GBP',
        name: 'Livre Sterling',
        symbol: '£',
        rate: 765.25, // Taux approximatif
        isDefault: false,
        isActive: true,
      },
      {
        code: 'NGN',
        name: 'Naira Nigérian',
        symbol: '₦',
        rate: 0.42, // Taux approximatif
        isDefault: false,
        isActive: true,
      },
    ];

    for (const currency of defaultCurrencies) {
      const existing = await this.currenciesRepository.findOne({
        where: { code: currency.code },
      });
      if (!existing) {
        await this.currenciesRepository.save(currency);
      }
    }
  }

  async create(createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    // Vérifier si le code existe déjà
    const existingCode = await this.currenciesRepository.findOne({
      where: { code: createCurrencyDto.code },
    });

    if (existingCode) {
      throw new ConflictException(
        `Une devise avec le code "${createCurrencyDto.code}" existe déjà`,
      );
    }

    // Si on veut créer une devise par défaut
    if (createCurrencyDto.isDefault) {
      await this.removeDefaultFlag();
    }

    const currency = this.currenciesRepository.create(createCurrencyDto);
    return await this.currenciesRepository.save(currency);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    isActive?: boolean,
  ): Promise<PaginatedResponse<Currency>> {
    const where: FindOptionsWhere<Currency> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.currenciesRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { isDefault: 'DESC', code: 'ASC' }, // Devise par défaut en premier
    });

    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }

  async findAllActive(): Promise<Currency[]> {
    return await this.currenciesRepository.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Currency> {
    const currency = await this.currenciesRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException(`Devise avec l'ID "${id}" non trouvée`);
    }

    return currency;
  }

  async findByCode(code: string): Promise<Currency> {
    const currency = await this.currenciesRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Devise avec le code "${code}" non trouvée`);
    }

    return currency;
  }

  async getDefaultCurrency(): Promise<Currency> {
    const defaultCurrency = await this.currenciesRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultCurrency) {
      // Si aucune devise par défaut, prendre la première active
      const firstActive = await this.currenciesRepository.findOne({
        where: { isActive: true },
        order: { code: 'ASC' },
      });

      if (!firstActive) {
        throw new NotFoundException('Aucune devise active trouvée');
      }

      // Définir comme devise par défaut
      firstActive.isDefault = true;
      return await this.currenciesRepository.save(firstActive);
    }

    return defaultCurrency;
  }

  async update(
    id: string,
    updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<Currency> {
    const currency = await this.findOne(id);

    // Vérifier l'unicité du code si modifié
    if (updateCurrencyDto.code && updateCurrencyDto.code !== currency.code) {
      const existingCode = await this.currenciesRepository.findOne({
        where: { code: updateCurrencyDto.code },
      });

      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Une devise avec le code "${updateCurrencyDto.code}" existe déjà`,
        );
      }
    }

    // Si on veut définir cette devise comme par défaut
    if (updateCurrencyDto.isDefault && !currency.isDefault) {
      await this.removeDefaultFlag(id);
    }

    // Si on veut retirer le statut par défaut mais que c'est la seule devise par défaut
    if (
      updateCurrencyDto.isDefault === false &&
      currency.isDefault &&
      !updateCurrencyDto.isDefault
    ) {
      const defaultCount = await this.currenciesRepository.count({
        where: { isDefault: true },
      });

      if (defaultCount <= 1) {
        throw new BadRequestException(
          "Impossible de retirer le statut par défaut de la seule devise par défaut. Définissez une autre devise comme défaut d'abord.",
        );
      }
    }

    Object.assign(currency, updateCurrencyDto);
    return await this.currenciesRepository.save(currency);
  }

  async remove(id: string): Promise<void> {
    const currency = await this.findOne(id);

    // Empêcher la suppression de la devise par défaut
    if (currency.isDefault) {
      throw new BadRequestException(
        "Impossible de supprimer la devise par défaut. Définissez une autre devise comme défaut d'abord.",
      );
    }

    await this.currenciesRepository.remove(currency);
  }

  async toggleStatus(id: string): Promise<Currency> {
    const currency = await this.findOne(id);

    // Empêcher la désactivation de la devise par défaut
    if (currency.isDefault && currency.isActive) {
      throw new BadRequestException(
        "Impossible de désactiver la devise par défaut. Définissez une autre devise comme défaut d'abord.",
      );
    }

    currency.isActive = !currency.isActive;
    return await this.currenciesRepository.save(currency);
  }

  async setAsDefault(id: string): Promise<Currency> {
    const currency = await this.findOne(id);

    if (!currency.isActive) {
      throw new BadRequestException(
        'Impossible de définir une devise inactive comme défaut',
      );
    }

    // Retirer le flag par défaut de toutes les autres devises
    await this.currenciesRepository.update(
      { isDefault: true },
      { isDefault: false },
    );

    // Définir celle-ci comme défaut
    currency.isDefault = true;
    return await this.currenciesRepository.save(currency);
  }

  private async removeDefaultFlag(excludeId?: string) {
    const where: any = { isDefault: true };
    if (excludeId) {
      where.id = Not(excludeId);
    }
    await this.currenciesRepository.update(where, { isDefault: false });
  }

  async convertAmount(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string,
  ): Promise<number> {
    if (fromCurrencyCode === toCurrencyCode) {
      return amount;
    }

    const fromCurrency = await this.findByCode(fromCurrencyCode);
    const toCurrency = await this.findByCode(toCurrencyCode);

    // Conversion via la devise par défaut (XOF)
    const amountInDefault = amount / fromCurrency.rate;
    const convertedAmount = amountInDefault * toCurrency.rate;

    return Math.round(convertedAmount * 100) / 100; // Arrondi à 2 décimales
  }

  async getExchangeRate(
    fromCurrencyCode: string,
    toCurrencyCode: string,
  ): Promise<number> {
    if (fromCurrencyCode === toCurrencyCode) {
      return 1;
    }

    const fromCurrency = await this.findByCode(fromCurrencyCode);
    const toCurrency = await this.findByCode(toCurrencyCode);

    // Taux de change = (to.rate / from.rate)
    return toCurrency.rate / fromCurrency.rate;
  }

  async formatAmount(
    amount: number,
    currencyCode: string,
    locale: string = 'fr-FR',
  ): Promise<string> {
    const currency = await this.findByCode(currencyCode);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
