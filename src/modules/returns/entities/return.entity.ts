import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum ReturnStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
  EXCHANGED = 'exchanged',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  NOT_SATISFIED = 'not_satisfied',
  DAMAGED = 'damaged',
  EXPIRED = 'expired',
  OTHER = 'other',
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  condition: 'new' | 'used' | 'damaged' | 'defective';
  restockable: boolean;
}

@Entity('product_returns')
export class ProductReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  returnNumber: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column()
  customerName: string;

  @Column({ type: 'jsonb' })
  items: ReturnItem[];

  @Column({
    type: 'enum',
    enum: ReturnReason,
  })
  reason: ReturnReason;

  @Column({ nullable: true, type: 'text' })
  reasonDetails: string;

  @Column({
    type: 'enum',
    enum: ReturnStatus,
    default: ReturnStatus.PENDING,
  })
  status: ReturnStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ nullable: true })
  refundMethod: string;

  @Column({ type: 'varchar', nullable: true })
  processedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
