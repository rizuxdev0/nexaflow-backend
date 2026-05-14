import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  code: string; // Internal code like 'starter', 'pro', etc.

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  features: string[];

  @Column({ default: 'monthly' })
  period: string; // 'monthly', 'yearly'

  @Column({ default: false })
  isPopular: boolean;

  @Column({ nullable: true })
  badge: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  icon: string; // lucide icon name

  @Column({ default: 0 })
  order: number;

  // Quotas & Limitations
  @Column({ default: 50 })
  maxProducts: number;

  @Column({ default: 1 })
  maxUsers: number;

  @Column({ default: 100 })
  maxOrdersPerMonth: number;

  @Column({ default: 1 })
  maxWarehouses: number;

  @Column({ default: true })
  hasPos: boolean;

  @Column({ default: false })
  hasChat: boolean;

  @Column({ default: false })
  hasAnalytics: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
