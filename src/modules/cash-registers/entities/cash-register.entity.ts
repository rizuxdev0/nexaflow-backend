import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

export enum CashRegisterStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({
    type: 'enum',
    enum: CashRegisterStatus,
    default: CashRegisterStatus.CLOSED,
  })
  status: CashRegisterStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSales: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalIn: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalOut: number;

  @Column({ type: 'varchar', nullable: true })
  openedById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
