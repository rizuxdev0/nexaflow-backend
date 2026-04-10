import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
import { SubscriptionPlan } from '../subscription-plans';

@Entity('store_config')
export class StoreConfig {
  @PrimaryColumn({ length: 50 })
  id: string;

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
