import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly repository: Repository<SubscriptionPlan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async create(data: Partial<SubscriptionPlan>) {
// ... rest of the service
    const plan = this.repository.create(data);
    return this.repository.save(plan);
  }

  async update(id: string, data: Partial<SubscriptionPlan>) {
    await this.findOne(id);
    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    return this.repository.remove(plan);
  }

  async seed() {
    const count = await this.repository.count();
    if (count > 0) return;

    const defaultPlans = [
      {
        name: 'Kiosque (Indépendant)',
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
        order: 1
      },
      {
        name: 'Boutique (Croissance)',
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
        order: 2
      },
      {
        name: 'Business (Elite)',
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
        order: 3
      },
      {
        name: 'Corporate (SaaS Cloud)',
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
        order: 4
      }
    ];

    for (const p of defaultPlans) {
      await this.create(p);
    }
  }
}
