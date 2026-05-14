import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { SubscriptionPlan as SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';
import { StoreConfig } from '../store-config/entities/store-config.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly repository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StoreConfig)
    private readonly storeConfigRepository: Repository<StoreConfig>,
  ) {}

  async findAll(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.repository.find({
      where,
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const plan = await this.repository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan non trouvé');
    return plan;
  }

  async subscribe(userId: string, planId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const plan = await this.findOne(planId);

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date();
    if (plan.period === 'monthly') {
      expiresAt.setMonth(now.getMonth() + 1);
    } else {
      expiresAt.setFullYear(now.getFullYear() + 1);
    }

    user.subscriptionPlanId = plan.id;
    user.subscriptionExpiresAt = expiresAt;

    return this.userRepository.save(user);
  }

  async create(data: Partial<SubscriptionPlanEntity>) {
// ... rest of the service
    const plan = this.repository.create(data);
    return this.repository.save(plan);
  }

  async update(id: string, data: Partial<SubscriptionPlanEntity>) {
    await this.findOne(id);
    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    return this.repository.remove(plan);
  }

  async seed() {
    const defaultPlans = [
      {
        name: 'Kiosque (Indépendant)',
        code: 'starter',
        price: 0,
        description: 'Pour les micro-entrepreneurs qui débutent.',
        features: [
          'Jusqu\'à 50 produits',
          '100 ventes par mois',
          'Point de Vente (POS) inclus',
          '1 utilisateur unique',
          'Support par email uniquement'
        ],
        icon: 'Building2',
        badge: 'Gratuit',
        order: 1,
        maxProducts: 50,
        maxUsers: 1,
        maxOrdersPerMonth: 100,
        maxWarehouses: 1,
        hasPos: true,
        hasChat: false,
        hasAnalytics: false
      },
      {
        name: 'Boutique (Croissance)',
        code: 'pro',
        price: 7500,
        description: 'Le choix préféré des boutiques physiques.',
        features: [
          'Jusqu\'à 1 000 produits',
          'Ventes illimitées',
          'Multi-utilisateurs (3)',
          'Chat Support Client',
          'Reporting & Statistiques de base',
          'Support direct WhatsApp'
        ],
        icon: 'Building',
        isPopular: true,
        badge: 'Populaire',
        order: 2,
        maxProducts: 1000,
        maxUsers: 3,
        maxOrdersPerMonth: 5000,
        maxWarehouses: 2,
        hasPos: true,
        hasChat: true,
        hasAnalytics: true
      },
      {
        name: 'Business (Elite)',
        code: 'business',
        price: 25000,
        description: 'Pour les entreprises multi-dépôts.',
        features: [
          'Produits illimités',
          'Jusqu\'à 5 entrepôts',
          '10 utilisateurs inclus',
          'Programme de Fidélité',
          'Rapports financiers avancés',
          'Support prioritaire 24/7'
        ],
        icon: 'Rocket',
        badge: 'Conseillé',
        order: 3,
        maxProducts: -1, // -1 for unlimited
        maxUsers: 10,
        maxOrdersPerMonth: -1,
        maxWarehouses: 5,
        hasPos: true,
        hasChat: true,
        hasAnalytics: true
      },
      {
        name: 'Corporate (SaaS Cloud)',
        code: 'enterprise',
        price: 75000,
        description: 'Solution complète pour la gestion multi-pays et SaaS complexe.',
        features: [
          'Entrepôts illimités partout au monde',
          'Gestion SaaS multi-instance',
          'API access & Webhooks',
          'SSO & Sécurité renforcée',
          'Account Manager dédié',
          'Formation sur site incluse'
        ],
        icon: 'Crown',
        badge: 'Sur-mesure',
        order: 4,
        maxProducts: -1,
        maxUsers: -1,
        maxOrdersPerMonth: -1,
        maxWarehouses: -1,
        hasPos: true,
        hasChat: true,
        hasAnalytics: true
      }
    ];

    for (const p of defaultPlans) {
      const existing = await this.repository.findOne({ 
        where: [{ code: p.code }, { name: p.name }] 
      });

      if (existing) {
        await this.repository.update(existing.id, p);
      } else {
        await this.create(p);
      }
    }
  }

  // ============ STATISTIQUES SUPERADMIN ============

  async getAdminStats() {
    // 1. Distribution des plans
    const planDistribution = await this.storeConfigRepository
      .createQueryBuilder('config')
      .select('config.subscriptionPlan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('config.subscriptionPlan')
      .getRawMany();

    // 2. Statut des abonnements
    const statusDistribution = await this.storeConfigRepository
      .createQueryBuilder('config')
      .select('config.subscriptionStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('config.subscriptionStatus')
      .getRawMany();

    // 3. Dernières inscriptions / changements de plan
    const recentSubscribers = await this.storeConfigRepository.find({
      where: { vendorId: Not(IsNull()) },
      relations: ['vendor'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    // 4. Revenus mensuels estimés
    const plans = await this.repository.find();
    let estimatedMonthlyRevenue = 0;
    
    planDistribution.forEach(dist => {
      const plan = plans.find(p => p.code === dist.plan);
      if (plan && plan.price) {
        estimatedMonthlyRevenue += Number(plan.price) * Number(dist.count);
      }
    });

    return {
      planDistribution: planDistribution.map(d => ({ 
        plan: d.plan, 
        count: Number(d.count) 
      })),
      statusDistribution: statusDistribution.map(d => ({ 
        status: d.status, 
        count: Number(d.count) 
      })),
      recentSubscribers: recentSubscribers.map(s => ({
        id: s.id,
        vendorId: s.vendorId,
        vendorName: s.vendor?.name || 'Inconnu',
        plan: s.subscriptionPlan,
        status: s.subscriptionStatus,
        updatedAt: s.updatedAt,
      })),
      estimatedMonthlyRevenue,
      totalVendors: await this.storeConfigRepository.count(),
    };
  }
}
