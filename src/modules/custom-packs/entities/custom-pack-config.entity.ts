import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('custom_pack_configs')
export class CustomPackConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 3 })
  minProducts: number;

  @Column({ default: 10 })
  maxProducts: number;

  @Column('simple-array', { nullable: true })
  eligibleCategoryIds: string[];

  @Column('jsonb', { nullable: true })
  discountTiers: any[];

  @Column({ default: true })
  requiresApproval: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
