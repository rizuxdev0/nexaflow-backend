import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CashRegister } from './cash-register.entity';

export enum CashMovementType {
  OPEN = 'open',
  CLOSE = 'close',
  SALE = 'sale',
  IN = 'in',
  OUT = 'out',
  REFUND = 'refund',
}

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  registerId: string;

  @ManyToOne(() => CashRegister)
  @JoinColumn({ name: 'registerId' })
  register: CashRegister;

  @Column({
    type: 'enum',
    enum: CashMovementType,
  })
  type: CashMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  recordedById: string;

  @Column({ nullable: true })
  orderId: string; // If related to a sale/refund

  @CreateDateColumn()
  createdAt: Date;
}
