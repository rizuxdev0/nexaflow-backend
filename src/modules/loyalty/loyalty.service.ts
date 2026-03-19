import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { EarnPointsDto, RedeemRewardDto } from './dto/transaction.dto';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyReward)
    private readonly rewardRepository: Repository<LoyaltyReward>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepository: Repository<LoyaltyTransaction>,
    private readonly customersService: CustomersService,
  ) {}

  getConfig() {
    return {
      pointsPerCurrency: 1,
      currencyUnit: 1000,
      tiers: [
        { tier: 'bronze', minPoints: 0, multiplier: 1, perks: ['Support basique'], color: '#CD7F32', icon: 'medal' },
        { tier: 'silver', minPoints: 500, multiplier: 1.2, perks: ['Support basique', 'Livraison gratuite > 20000'], color: '#C0C0C0', icon: 'medal' },
        { tier: 'gold', minPoints: 2000, multiplier: 1.5, perks: ['Support prio', 'Livraison gratuite'], color: '#FFD700', icon: 'medal' },
        { tier: 'platinum', minPoints: 5000, multiplier: 2, perks: ['Support prio', 'Events exclusifs'], color: '#E5E4E2', icon: 'gem' },
      ]
    };
  }

  async getRewards(page = 1, pageSize = 20) {
    const [data, total] = await this.rewardRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getActiveRewards() {
    return this.rewardRepository.find({ where: { isActive: true, stock: Math.max(1, 0) } }); // need to proper check stock
  }

  async getTransactions(customerId?: string, page = 1, pageSize = 20) {
    const where = customerId ? { customerId } : {};
    const [data, total] = await this.transactionRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createReward(dto: CreateLoyaltyRewardDto) {
    const reward = this.rewardRepository.create(dto);
    return this.rewardRepository.save(reward);
  }

  async updateReward(id: string, dto: UpdateLoyaltyRewardDto) {
    const reward = await this.rewardRepository.findOne({ where: { id } });
    if (!reward) throw new NotFoundException('Reward not found');
    Object.assign(reward, dto);
    return this.rewardRepository.save(reward);
  }

  async earnPoints(dto: EarnPointsDto) {
    const { customerId, points, orderId } = dto;
    const customer = await this.customersService.findOne(customerId);
    if (!customer) throw new NotFoundException('Customer not found');

    const txn = this.transactionRepository.create({
      customerId,
      type: 'earn',
      points,
      description: `Achat commande #${orderId}`,
      orderId,
    });
    await this.transactionRepository.save(txn);

    await this.customersService.updatePoints(customerId, { operation: 'add' as any, points });
    return txn;
  }

  async redeemReward(dto: RedeemRewardDto) {
    const { customerId, rewardId } = dto;
    
    // Check reward
    const reward = await this.rewardRepository.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (!reward.isActive || reward.stock <= 0) throw new BadRequestException('Reward not available');

    // Check customer
    const customer = await this.customersService.findOne(customerId);
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.loyaltyPoints < reward.pointsCost) {
      throw new BadRequestException('Not enough points');
    }

    // Deduct stock, deduct points, create transaction
    reward.stock -= 1;
    await this.rewardRepository.save(reward);
    
    await this.customersService.updatePoints(customerId, { operation: 'remove' as any, points: reward.pointsCost });

    const txn = this.transactionRepository.create({
      customerId,
      type: 'redeem',
      points: -reward.pointsCost,
      description: `Échange: ${reward.name}`,
      rewardId,
    });
    return this.transactionRepository.save(txn);
  }
}
