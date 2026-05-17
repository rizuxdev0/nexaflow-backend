import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Brackets } from 'typeorm';
import { SubscriptionPlan as SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';
import { StoreConfig } from '../store-config/entities/store-config.entity';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly repository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StoreConfig)
    private readonly storeConfigRepository: Repository<StoreConfig>,
    private readonly tenantService: TenantService,
  ) {}

  private get userRepo() { return this.tenantService.tenantRepo(this.userRepository); }
  private get configRepo() { return this.tenantService.tenantRepo(this.storeConfigRepository); }

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

  async create(data: any) {
    const plan = this.repository.create(data);
    return this.repository.save(plan);
  }

  async update(id: string, data: any) {
    const plan = await this.findOne(id);
    Object.assign(plan, data);
    return this.repository.save(plan);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    return this.repository.remove(plan);
  }

  async subscribe(userId: string, planId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const plan = await this.findOne(planId);

    const now = new Date();
    const expiresAt = new Date();
    if (plan.period === 'monthly') {
      expiresAt.setMonth(now.getMonth() + 1);
    } else {
      expiresAt.setFullYear(now.getFullYear() + 1);
    }

    user.subscriptionPlanId = plan.id;
    user.subscriptionExpiresAt = expiresAt;

    // Also update StoreConfig
    const config = await this.configRepo.findOne({ where: { vendorId: user.vendorId } });
    if (config) {
      config.subscriptionPlan = plan.code as any;
      config.subscriptionStatus = 'active';
      await this.configRepo.save(config);
    }

    return this.userRepo.save(user);
  }

  async getVendorSubscriptionStats() {
    const vendorId = this.tenantService.getVendorId();
    if (!vendorId) throw new NotFoundException('Contexte vendeur manquant');

    const config = await this.configRepo.findOne({ where: { vendorId } });
    if (!config) throw new NotFoundException('Configuration boutique non trouvée');

    const plan = await this.repository.findOne({ where: { code: config.subscriptionPlan } });
    
    // Usage stats - Simplified count for resources
    // We use the raw repository manager to avoid circular dependencies if we were to inject services
    const productCount = await this.userRepo.manager.getRepository('Product').count({ where: { vendorId } });
    const userCount = await this.userRepo.count();
    const orderCount = await this.userRepo.manager.getRepository('Order').count({ where: { vendorId } });

    return {
      currentPlan: config.subscriptionPlan,
      status: config.subscriptionStatus,
      expiresAt: (config as any).subscriptionExpiresAt || config.updatedAt,
      planDetails: plan,
      usage: {
        products: { current: productCount, max: plan?.maxProducts || 50 },
        users: { current: userCount, max: plan?.maxUsers || 1 },
        orders: { current: orderCount, max: plan?.maxOrdersPerMonth || 100 },
      }
    };
  }

  async getAdminStats() {
    const planDistribution = await this.storeConfigRepository
      .createQueryBuilder('config')
      .select('config.subscriptionPlan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('config.subscriptionPlan')
      .getRawMany();

    const statusDistribution = await this.storeConfigRepository
      .createQueryBuilder('config')
      .select('config.subscriptionStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('config.subscriptionStatus')
      .getRawMany();

    const recentSubscribers = await this.storeConfigRepository.find({
      where: { vendorId: Not(IsNull()) },
      relations: ['vendor'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

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

  async seed() {
    const defaultPlans = [
      {
        name: 'Starter',
        code: 'starter',
        description: 'Pour les petites boutiques débutantes',
        price: 0,
        period: 'monthly',
        maxProducts: 50,
        maxUsers: 1,
        maxOrdersPerMonth: 100,
        features: ['Gestion de stock de base', 'Ventes POS', 'Rapports simples'],
        isActive: true,
        order: 1,
      },
      {
        name: 'Pro',
        code: 'pro',
        description: 'Pour les entreprises en croissance',
        price: 15000,
        period: 'monthly',
        maxProducts: 500,
        maxUsers: 5,
        maxOrdersPerMonth: 1000,
        features: ['Tout du plan Starter', 'Ecommerce intégré', 'Gestion multi-succursales (2)', 'Support prioritaire'],
        isActive: true,
        order: 2,
      },
      {
        name: 'Business',
        code: 'business',
        description: 'Solution complète pour les grandes entreprises',
        price: 45000,
        period: 'monthly',
        maxProducts: 5000,
        maxUsers: 20,
        maxOrdersPerMonth: 10000,
        features: ['Tout du plan Pro', 'Multi-succursales illimité', 'API Access', 'Account Manager dédié'],
        isActive: true,
        order: 3,
      },
    ];

    for (const planData of defaultPlans) {
      const existing = await this.repository.findOne({ where: { code: planData.code } });
      if (!existing) {
        await this.repository.save(this.repository.create(planData));
      }
    }

    return { message: 'Plans initialisés avec succès' };
  }
}
