import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('returns')
export class Return {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  returnNumber: string;

  @Column()
  orderId: string;

  @Column()
  orderNumber: string;

  @Column()
  customerId: string;

  @Column()
  customerName: string;

  @Column({ type: 'jsonb' })
  items: any[];

  @Column()
  reason: string;

  @Column({ nullable: true, type: 'text' })
  reasonDetails: string;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'approved' | 'rejected' | 'refunded' | 'exchanged'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ nullable: true })
  refundMethod: string;

  @Column({ nullable: true })
  processedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
