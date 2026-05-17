import { SubscriptionPlan } from '../subscription-plans';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column, Entity, UpdateDateColumn, OneToOne } from 'typeorm';

@Entity('store_config')
export class StoreConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Vendor, (vendor) => vendor.storeConfig, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ unique: true, nullable: true })
  vendorId: string;

  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.STARTER })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ default: 'active' })
  subscriptionStatus: 'active' | 'expired' | 'trial';

  @Column({ type: 'jsonb', default: {} })
  identity: any;

  @Column({ type: 'jsonb', default: {} })
  checkout: any;

  @Column({ type: 'jsonb', default: {} })
  content: any;

  @Column({ type: 'jsonb', default: {} })
  seo: any;

  @Column({ type: 'jsonb', default: {} })
  social: any;

  @Column({ type: 'jsonb', default: [] })
  partners: any[];

  @Column({ type: 'jsonb', default: [] })
  features: any[];

  @Column({ type: 'jsonb', default: {} })
  appearance: any;

  @Column({ type: 'jsonb', default: { jwtExpiresIn: '24h', idleTimeoutMinutes: 30, autoLockEnabled: true } })
  security: any;

  @Column({ type: 'jsonb', default: { facebook: '', google: '', tiktok: '', pinterest: '', snapchat: '', customScripts: [] } })
  pixels: any;

  @UpdateDateColumn()
  updatedAt: Date;
}
