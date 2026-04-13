import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRule, CommissionRuleType } from './entities/commission-rule.entity';
import { Vendor } from './entities/vendor.entity';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepository: Repository<CommissionRule>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async calculateCommission(vendorId: string, categoryId: string, amount: number) {
    if (!vendorId) return { rate: 0, amount: 0 };

    // 1. Get all active rules
    const rules = await this.ruleRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });

    let selectedRule: CommissionRule | null = null;
    let rate = 15; // Global default
    let fixedFee = 0;

    // 2. Search for the most specific rule
    // Try Vendor-specific rule first
    selectedRule = rules.find(r => r.type === CommissionRuleType.VENDOR && r.vendorId === vendorId);
    
    // If not, try Category-specific rule
    if (!selectedRule) {
      selectedRule = rules.find(r => r.type === CommissionRuleType.CATEGORY && r.categoryId === categoryId);
    }

    // If not, try Tier-specific rule
    if (!selectedRule) {
      const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
      if (vendor) {
        selectedRule = rules.find(r => r.type === CommissionRuleType.TIER && r.vendorTier === vendor.tier);
        rate = vendor.commissionRate || 15; // Fallback to vendor's own set rate
      }
    }

    if (selectedRule) {
      rate = Number(selectedRule.rate);
      fixedFee = Number(selectedRule.fixedFee);
    }

    const commissionAmount = (amount * (rate / 100)) + fixedFee;

    return {
      rate,
      fixedFee,
      amount: Math.round(commissionAmount),
    };
  }

  async findAllRules() {
    return await this.ruleRepository.find({
      relations: ['vendor', 'category'],
      order: { priority: 'DESC' },
    });
  }

  async createRule(data: any) {
    const rule = this.ruleRepository.create(data as object);
    return await this.ruleRepository.save(rule);
  }

  async updateRule(id: string, data: any) {
    await this.ruleRepository.update(id, data);
    return await this.ruleRepository.findOne({ where: { id } });
  }

  async removeRule(id: string) {
    return await this.ruleRepository.delete(id);
  }
}
