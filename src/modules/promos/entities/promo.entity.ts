import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromoType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: PromoType,
    default: PromoType.PERCENTAGE,
  })
  type: PromoType;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  value: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  maxDiscountAmount: number;

  @Column({ type: 'int', default: 0 })
  usageLimit: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'simple-array', nullable: true })
  applicableProducts: string[];

  @Column({ type: 'simple-array', nullable: true })
  applicableCategories: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
