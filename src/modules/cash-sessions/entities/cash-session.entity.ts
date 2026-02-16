import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Register } from '../../registers/entities/register.entity';
import { Order } from '../../orders/entities/order.entity';
import { User } from 'src/modules/users/entities/user.entity';

export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  SUSPENDED = 'suspended',
}

@Entity('cash_sessions')
export class CashSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Register)
  @JoinColumn({ name: 'registerId' })
  register: Register;

  @Column()
  registerId: string;

  // À décommenter quand User sera créé
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.OPEN,
  })
  status: SessionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  openingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  closingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  expectedAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  difference: number;

  @Column({ default: 0 })
  salesCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  salesTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  cashIn: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  cashOut: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column()
  openedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ type: 'jsonb', default: [] })
  payments: {
    method: string;
    count: number;
    total: number;
  }[];

  @OneToMany(() => Order, (order) => order.session)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
