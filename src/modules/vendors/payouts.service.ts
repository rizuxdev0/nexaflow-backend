import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payout, PayoutStatus } from './entities/payout.entity';
import { Vendor } from './entities/vendor.entity';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(page = 1, pageSize = 20, status?: string) {
    const query = this.payoutRepository.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.vendor', 'vendor')
      .orderBy('payout.createdAt', 'DESC');

    if (status && status !== 'all') {
      query.andWhere('payout.status = :status', { status });
    }

    const [data, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByVendor(vendorId: string) {
    return await this.payoutRepository.find({
      where: { vendorId },
      order: { createdAt: 'DESC' },
    });
  }

  async requestPayout(vendorId: string, amount: number, method: string) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendeur non trouvé');

    if (Number(vendor.balance) < amount) {
      throw new BadRequestException('Solde insuffisant pour cette demande');
    }

    if (amount < 5000) { // Minimum payout 5000 FCFA
      throw new BadRequestException('Le montant minimum de retrait est de 5000 FCFA');
    }

    const payout = this.payoutRepository.create({
      vendorId,
      amount,
      method,
      status: PayoutStatus.PENDING,
    });

    return await this.payoutRepository.save(payout);
  }

  async processPayout(id: string, status: PayoutStatus, reference?: string, notes?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payout = await queryRunner.manager.findOne(Payout, { 
        where: { id },
        relations: ['vendor']
      });

      if (!payout) throw new NotFoundException('Demande de retrait non trouvée');
      if (payout.status === PayoutStatus.COMPLETED) throw new BadRequestException('Déjà complétée');

      const vendor = payout.vendor;

      if (status === PayoutStatus.COMPLETED) {
        // Deduct from vendor balance
        if (Number(vendor.balance) < Number(payout.amount)) {
          throw new BadRequestException('Solde insuffisant');
        }
        
        vendor.balance = Number(vendor.balance) - Number(payout.amount);
        vendor.totalRevenue = Number(vendor.totalRevenue) - Number(payout.amount); // totalRevenue is net for vendor? Not sure, maybe better separate column
        // We track everything in separate columns in Vendor entity anyway
        
        payout.status = PayoutStatus.COMPLETED;
        payout.transactionReference = reference;
        payout.processedAt = new Date();
      } else if (status === PayoutStatus.FAILED || status === PayoutStatus.CANCELLED) {
        payout.status = status;
      }

      if (notes) payout.notes = notes;

      await queryRunner.manager.save(vendor);
      await queryRunner.manager.save(payout);

      await queryRunner.commitTransaction();
      return payout;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
