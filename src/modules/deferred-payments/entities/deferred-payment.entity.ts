import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('deferred_payments')
export class DeferredPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  orderNumber: string;

  @Column()
  customerId: string;

  @Column()
  customerName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  remainingAmount: number;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'partial' | 'paid' | 'overdue'

  @Column({ type: 'jsonb', default: [] })
  payments: any[]; // DeferredPaymentEntry[]

  @Column({ type: 'jsonb', default: [] })
  installments: any[]; // Installment[]

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
