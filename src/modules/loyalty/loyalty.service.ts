import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { EarnPointsDto, RedeemRewardDto } from './dto/transaction.dto';
import { CustomersService } from '../customers/customers.service';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyReward)
    private readonly rewardRepository: Repository<LoyaltyReward>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepository: Repository<LoyaltyTransaction>,
    private readonly customersService: CustomersService,
    private readonly tenantService: TenantService,
  ) {}

  private get rewardRepo() {
    return this.tenantService.tenantRepo(this.rewardRepository);
  }

  private get transactionRepo() {
    return this.tenantService.tenantRepo(this.transactionRepository);
  }

  getConfig() {
    return {
      pointsPerCurrency: 1,
      currencyUnit: 1000,
      tiers: [
        { tier: 'bronze', minPoints: 0, multiplier: 1, perks: ['Accès aux promotions membres', 'Newsletter exclusive'], color: 'from-amber-600 to-amber-800', icon: '🥉' },
        { tier: 'silver', minPoints: 500, multiplier: 1.5, perks: ['Livraison gratuite dès 30 000 FCFA', 'Remise anniversaire 5%', 'Accès ventes privées'], color: 'from-gray-400 to-gray-600', icon: '🥈' },
        { tier: 'gold', minPoints: 2000, multiplier: 2, perks: ['Livraison gratuite illimitée', 'Remise anniversaire 10%', 'Service client prioritaire', 'Accès avant-premières'], color: 'from-yellow-400 to-yellow-600', icon: '🥇' },
        { tier: 'platinum', minPoints: 5000, multiplier: 3, perks: ['Tout Gold +', 'Personal shopper', 'Retours gratuits 60 jours', 'Événements VIP exclusifs', 'Remise permanente 5%'], color: 'from-purple-400 to-purple-700', icon: '💎' },
      ]
    };
  }

  async getStats() {
    const pointStats = await this.customersService.getLoyaltyStats();
    const tierRaw = await this.customersService.getTierDistribution();
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const tierDistribution = tiers.map(t => {
      const found = tierRaw.find(r => r.loyaltyTier === t);
      return {
        tier: t,
        count: found ? parseInt(found.count) : 0
      };
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactionTrends = await this.transactionRepo
      .createQueryBuilder('tx')
      .select("DATE(tx.createdAt)", "date")
      .addSelect("SUM(CASE WHEN tx.type = 'earn' THEN 1 ELSE 0 END)", "earnCount")
      .addSelect("SUM(CASE WHEN tx.type = 'redeem' THEN 1 ELSE 0 END)", "redeemCount")
      .where("tx.createdAt >= :date", { date: thirtyDaysAgo })
      .groupBy("DATE(tx.createdAt)")
      .orderBy("date", "ASC")
      .getRawMany();

    const globalTx = await this.transactionRepo
      .createQueryBuilder('tx')
      .select("SUM(CASE WHEN tx.type = 'earn' THEN 1 ELSE 0 END)", "totalEarn")
      .addSelect("SUM(CASE WHEN tx.type = 'redeem' THEN 1 ELSE 0 END)", "totalRedeem")
      .getRawOne();

    return {
      pointStats,
      tierDistribution,
      transactionTrends,
      globalTx: {
        totalEarn: parseInt(globalTx.totalEarn) || 0,
        totalRedeem: parseInt(globalTx.totalRedeem) || 0
      }
    };
  }

  async calculateEarnedPoints(customerId: string, orderTotal: number): Promise<number> {
    const customer = await this.customersService.findOne(customerId);
    const config = this.getConfig();
    const tier = config.tiers.find(t => t.tier === (customer.loyaltyTier || 'bronze'));
    
    const basePoints = Math.floor(Number(orderTotal) / config.currencyUnit);
    return Math.floor(basePoints * (tier?.multiplier || 1));
  }

  async getRewards(page = 1, pageSize = 20) {
    const [data, total] = await this.rewardRepo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getActiveRewards() {
    return this.rewardRepo.find({ where: { isActive: true, stock: MoreThan(0) } });
  }

  async getTransactions(customerId?: string, page = 1, pageSize = 20) {
    const where = customerId ? { customerId } : {};
    const [data, total] = await this.transactionRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createReward(dto: CreateLoyaltyRewardDto) {
    const reward = this.rewardRepo.create({
      ...dto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return this.rewardRepo.save(reward);
  }

  async updateReward(id: string, dto: UpdateLoyaltyRewardDto) {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (!reward) throw new NotFoundException('Reward not found');
    Object.assign(reward, dto);
    return this.rewardRepo.save(reward);
  }

  async earnPoints(dto: EarnPointsDto) {
    const { customerId, points, orderId } = dto;
    const customer = await this.customersService.findOne(customerId);
    if (!customer) throw new NotFoundException('Customer not found');

    const txn = this.transactionRepo.create({
      customerId,
      type: 'earn',
      points,
      description: `Achat commande #${orderId}`,
      orderId,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    await this.transactionRepo.save(txn);

    await this.customersService.updatePoints(customerId, { operation: 'add' as any, points });
    return txn;
  }

  async redeemReward(dto: RedeemRewardDto) {
    const { customerId, rewardId } = dto;
    
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (!reward.isActive || reward.stock <= 0) throw new BadRequestException('Reward not available');

    const customer = await this.customersService.findOne(customerId);
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.loyaltyPoints < reward.pointsCost) {
      throw new BadRequestException('Not enough points');
    }

    reward.stock -= 1;
    await this.rewardRepo.save(reward);
    
    await this.customersService.updatePoints(customerId, { operation: 'remove' as any, points: reward.pointsCost });

    const txn = this.transactionRepo.create({
      customerId,
      type: 'redeem',
      points: -reward.pointsCost,
      description: `Échange: ${reward.name}`,
      rewardId,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return this.transactionRepo.save(txn);
  }

  async hasEarnedPoints(orderId: string): Promise<boolean> {
    const existing = await this.transactionRepo.findOne({
      where: { orderId, type: 'earn' }
    });
    return !!existing;
  }
}
