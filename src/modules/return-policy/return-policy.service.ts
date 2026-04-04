import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnPolicy } from './entities/return-policy.entity';

const DEFAULT_POLICY = {
  defaultReturnDays: 30,
  defaultRefundTypes: ['full', 'exchange_only'],
  defaultConditions: "Le produit doit être retourné dans son état d'origine, non utilisé, avec tous les accessoires et emballages.",
  categoryRules: [],
  legalText: `## Politique de retour\n\nNous souhaitons que vous soyez entièrement satisfait de votre achat. Si ce n'est pas le cas, vous pouvez retourner la plupart des articles dans les **30 jours** suivant la date de livraison.\n\n### Comment effectuer un retour ?\n\n1. Contactez notre service client\n2. Emballez soigneusement le produit\n3. Expédiez le colis\n4. Recevez votre remboursement sous 5-10 jours ouvrés`,
  contactEmail: 'retours@nexaflow.tg',
  contactPhone: '+228 90 12 34 56',
  isActive: true,
  requiresReceipt: true,
  requiresOriginalPackaging: true,
  restockingFeePercent: 0,
};

@Injectable()
export class ReturnPolicyService {
  constructor(
    @InjectRepository(ReturnPolicy)
    private repo: Repository<ReturnPolicy>,
  ) {}

  private async getOrCreate(): Promise<ReturnPolicy> {
    let record = await this.repo.findOne({ where: { id: 'default' } });
    if (!record) {
      record = this.repo.create({ id: 'default', config: DEFAULT_POLICY });
      await this.repo.save(record);
    }
    return record;
  }

  async getPolicy() {
    const record = await this.getOrCreate();
    return { ...record.config, updatedAt: record.updatedAt?.toISOString() };
  }

  async updatePolicy(data: Record<string, any>) {
    const record = await this.getOrCreate();
    const updated = { ...record.config, ...data };
    await this.repo.query(
      `UPDATE return_policy SET config = $1::jsonb WHERE id = 'default'`,
      [JSON.stringify(updated)],
    );
    const fresh = await this.repo.findOne({ where: { id: 'default' } });
    return { ...fresh!.config, updatedAt: fresh!.updatedAt?.toISOString() };
  }

  async updateCategoryRule(rule: Record<string, any>) {
    const record = await this.getOrCreate();
    const config = record.config as any;
    const rules: any[] = config.categoryRules || [];
    const idx = rules.findIndex((r: any) => r.categoryId === rule.categoryId);
    if (idx >= 0) {
      rules[idx] = rule;
    } else {
      rules.push(rule);
    }
    config.categoryRules = rules;
    await this.repo.query(
      `UPDATE return_policy SET config = $1::jsonb WHERE id = 'default'`,
      [JSON.stringify(config)],
    );
    const fresh = await this.repo.findOne({ where: { id: 'default' } });
    return { ...fresh!.config, updatedAt: fresh!.updatedAt?.toISOString() };
  }

  async removeCategoryRule(categoryId: string) {
    const record = await this.getOrCreate();
    const config = record.config as any;
    config.categoryRules = (config.categoryRules || []).filter(
      (r: any) => r.categoryId !== categoryId,
    );
    await this.repo.query(
      `UPDATE return_policy SET config = $1::jsonb WHERE id = 'default'`,
      [JSON.stringify(config)],
    );
    const fresh = await this.repo.findOne({ where: { id: 'default' } });
    return { ...fresh!.config, updatedAt: fresh!.updatedAt?.toISOString() };
  }

  async resetToDefault() {
    await this.repo.query(
      `UPDATE return_policy SET config = $1::jsonb WHERE id = 'default'`,
      [JSON.stringify(DEFAULT_POLICY)],
    );
    const fresh = await this.repo.findOne({ where: { id: 'default' } });
    return { ...fresh!.config, updatedAt: fresh!.updatedAt?.toISOString() };
  }
}
