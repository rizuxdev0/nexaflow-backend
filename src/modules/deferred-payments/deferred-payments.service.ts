import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeferredPayment } from './entities/deferred-payment.entity';
import { CreateDeferredPaymentDto, RecordPaymentEntryDto, ExtendDueDateDto, OverdueActionDto } from './dto/deferred-payment.dto';

@Injectable()
export class DeferredPaymentsService {
  constructor(
    @InjectRepository(DeferredPayment)
    private readonly deferredPaymentRepo: Repository<DeferredPayment>,
  ) {}

  async getAll(page: number = 1, pageSize: number = 20, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await this.deferredPaymentRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getByCustomer(customerId: string) {
    return this.deferredPaymentRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(createDto: CreateDeferredPaymentDto): Promise<DeferredPayment> {
    const dp = this.deferredPaymentRepo.create({
      ...createDto,
      paidAmount: 0,
      remainingAmount: createDto.totalAmount,
      status: 'pending',
      payments: [],
      // Use provided installments or generate default
      installments: createDto.installments?.length ? createDto.installments : this.generateInstallments(createDto.totalAmount, new Date(), new Date(createDto.dueDate)),
    });
    return this.deferredPaymentRepo.save(dp);
  }

  async recordPayment(id: string, entryDto: RecordPaymentEntryDto): Promise<DeferredPayment> {
    const dp = await this.deferredPaymentRepo.findOne({ where: { id } });
    if (!dp) throw new NotFoundException('Paiement différé non trouvé');

    const newEntry = {
      ...entryDto,
      id: `dpe-${Date.now()}`,
    };

    dp.payments.push(newEntry);
    dp.paidAmount = Number(dp.paidAmount) + Number(entryDto.amount);
    dp.remainingAmount = dp.totalAmount - dp.paidAmount;

    if (entryDto.installmentIds && entryDto.installmentIds.length > 0) {
      entryDto.installmentIds.forEach(instId => {
        const inst = dp.installments.find(i => i.id === instId);
        if (inst) {
          inst.status = 'paid';
          inst.paidAt = entryDto.paidAt;
        }
      });
    }

    dp.status = dp.remainingAmount <= 0 ? 'paid' : 'partial';

    return this.deferredPaymentRepo.save(dp);
  }

  async processOverdue(actionDto?: OverdueActionDto) {
    if (actionDto && actionDto.action === 'notify') {
      return this.sendOverdueNotifications();
    }
    return this.checkOverdue();
  }

  private async checkOverdue() {
    const payments = await this.deferredPaymentRepo.find({ where: { status: 'pending' /* or partial */ } });
    const now = new Date();
    let updatedCount = 0;

    for (const p of payments) {
      let changed = false;
      if (p.status !== 'paid') {
        p.installments.forEach(inst => {
          if (inst.status === 'pending' && new Date(inst.dueDate) < now) {
            inst.status = 'overdue';
            changed = true;
          }
        });
        if (new Date(p.dueDate) < now) {
          p.status = 'overdue';
          changed = true;
        }
      }
      if (changed) {
        await this.deferredPaymentRepo.save(p);
        updatedCount++;
      }
    }
    return { updated: updatedCount };
  }

  private async sendOverdueNotifications() {
    const payments = await this.deferredPaymentRepo.find();
    const now = new Date().getTime();
    const threeDaysMs = 3 * 86400000;
    const details: any[] = [];

    for (const p of payments) {
      if (p.status === 'paid') continue;
      let changed = false;

      p.installments.forEach(inst => {
        if (inst.status !== 'overdue') return;
        const overdueMs = now - new Date(inst.dueDate).getTime();
        if (overdueMs < threeDaysMs) return;
        
        if (inst.notifiedAt && (now - new Date(inst.notifiedAt).getTime()) < 7 * 86400000) return;
        
        inst.notifiedAt = new Date().toISOString();
        changed = true;

        details.push({
          customerId: p.customerId,
          customerName: p.customerName,
          installmentLabel: inst.label,
          daysOverdue: Math.floor(overdueMs / 86400000),
          amount: inst.amount,
        });
      });

      if (changed) {
        await this.deferredPaymentRepo.save(p);
      }
    }
    return { sent: details.length, details };
  }

  async extend(id: string, extendDto: ExtendDueDateDto): Promise<DeferredPayment> {
    const dp = await this.deferredPaymentRepo.findOne({ where: { id } });
    if (!dp) throw new NotFoundException('Paiement différé non trouvé');

    if (extendDto.installmentId) {
      const inst = dp.installments.find(i => i.id === extendDto.installmentId);
      if (!inst) throw new NotFoundException('Échéance non trouvée');
      inst.dueDate = extendDto.newDueDate;
      if (inst.status === 'overdue' && new Date(extendDto.newDueDate) > new Date()) {
        inst.status = 'pending';
      }
      
      const hasOverdue = dp.installments.some(i => i.status === 'overdue');
      if (!hasOverdue && dp.status === 'overdue') {
        dp.status = dp.paidAmount > 0 ? 'partial' : 'pending';
      }
    } else {
      dp.dueDate = new Date(extendDto.newDueDate);
      if (dp.status === 'overdue') {
        dp.status = dp.paidAmount > 0 ? 'partial' : 'pending';
      }
    }

    return this.deferredPaymentRepo.save(dp);
  }

  async cancel(id: string): Promise<void> {
    const dp = await this.deferredPaymentRepo.findOne({ where: { id } });
    if (!dp) throw new NotFoundException('Paiement différé non trouvé');
    await this.deferredPaymentRepo.remove(dp);
  }

  // --- Helper ---
  private generateInstallments(total: number, createdAt: Date, dueDate: Date) {
    const start = createdAt.getTime();
    const end = dueDate.getTime();
    const span = end - start;
    const count = span > 50 * 86400000 ? 3 : span > 25 * 86400000 ? 2 : 1;
    const base = Math.round(total / count);
    
    return Array.from({ length: count }, (_, i) => ({
      id: `inst-${Date.now()}-${i}`,
      label: `Échéance ${i + 1}/${count}`,
      amount: i === count - 1 ? total - base * (count - 1) : base,
      dueDate: new Date(start + (span / count) * (i + 1)).toISOString(),
      status: 'pending',
    }));
  }
}
