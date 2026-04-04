import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('store_config')
export class StoreConfig {
  @PrimaryColumn({ length: 50 })
  id: string;

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


  @UpdateDateColumn()
  updatedAt: Date;
}
