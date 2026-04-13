import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vendor } from './vendor.entity';
import { Category } from '../../categories/entities/category.entity';

export enum CommissionRuleType {
  CATEGORY = 'category',
  VENDOR = 'vendor',
  TIER = 'tier',
  GLOBAL = 'global',
}

@Entity('commission_rules')
export class CommissionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CommissionRuleType,
    default: CommissionRuleType.GLOBAL,
  })
  type: CommissionRuleType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number; // Percentage

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fixedFee: number; // Optional fixed fee per sale

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ nullable: true })
  vendorId: string;

  @Column({ nullable: true })
  vendorTier: string; // starter, professional, enterprise

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number; // Higher number = higher precedence

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
