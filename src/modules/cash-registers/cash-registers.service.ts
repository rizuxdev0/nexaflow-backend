import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegister, CashRegisterStatus } from './entities/cash-register.entity';
import { CashMovement, CashMovementType } from './entities/cash-movement.entity';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly registerRepo: Repository<CashRegister>,
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
  ) {}

  async findAll(branchId?: string) {
    const where = branchId ? { branchId } : {};
    return this.registerRepo.find({ where, relations: ['branch'] });
  }

  async findOne(id: string) {
    const register = await this.registerRepo.findOne({ where: { id }, relations: ['branch'] });
    if (!register) throw new NotFoundException('Caisse non trouvée');
    return register;
  }

  async openRegister(id: string, openingBalance: number, userId: string) {
    const register = await this.findOne(id);
    if (register.status === CashRegisterStatus.OPEN) {
      throw new BadRequestException('La caisse est déjà ouverte');
    }

    register.status = CashRegisterStatus.OPEN;
    register.openingBalance = openingBalance;
    register.currentBalance = openingBalance;
    register.totalSales = 0;
    register.totalIn = 0;
    register.totalOut = 0;
    register.openedById = userId;
    register.openedAt = new Date();
    register.closedAt = null;

    const saved = await this.registerRepo.save(register);

    await this.recordMovement(id, CashMovementType.OPEN, openingBalance, 'Ouverture de caisse', userId);

    return saved;
  }

  async closeRegister(id: string, userId: string) {
    const register = await this.findOne(id);
    if (register.status === CashRegisterStatus.CLOSED) {
      throw new BadRequestException('La caisse est déjà fermée');
    }

    register.status = CashRegisterStatus.CLOSED;
    register.closedAt = new Date();
    
    const saved = await this.registerRepo.save(register);

    await this.recordMovement(id, CashMovementType.CLOSE, 0, 'Fermeture de caisse', userId);

    return saved;
  }

  async recordMovement(registerId: string, type: CashMovementType, amount: number, reason: string, userId: string, orderId?: string) {
    const register = await this.findOne(registerId);
    
    // Update register balance based on movement type
    if (type === CashMovementType.SALE || type === CashMovementType.IN) {
      register.currentBalance = Number(register.currentBalance) + Number(amount);
      if (type === CashMovementType.SALE) register.totalSales = Number(register.totalSales) + Number(amount);
      else register.totalIn = Number(register.totalIn) + Number(amount);
    } else if (type === CashMovementType.OUT || type === CashMovementType.REFUND) {
      register.currentBalance = Number(register.currentBalance) - Number(amount);
      if (type === CashMovementType.REFUND) register.totalSales = Number(register.totalSales) - Number(amount);
      else register.totalOut = Number(register.totalOut) + Number(amount);
    }

    await this.registerRepo.save(register);

    const movement = this.movementRepo.create({
      registerId,
      type,
      amount,
      balanceAfter: register.currentBalance,
      reason,
      recordedById: userId,
      orderId
    });

    return this.movementRepo.save(movement);
  }

  async getMovements(registerId: string, page = 1, pageSize = 50) {
    return this.movementRepo.find({
      where: { registerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  }
}
