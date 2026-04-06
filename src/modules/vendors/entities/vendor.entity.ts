import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum VendorStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum VendorTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  banner: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  website: string;

  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.PENDING,
  })
  status: VendorStatus;

  @Column({
    type: 'enum',
    enum: VendorTier,
    default: VendorTier.STARTER,
  })
  tier: VendorTier;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  totalProducts: number;

  @Column({ default: 0 })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCommission: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pendingPayout: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccount: string;

  @Column({ nullable: true })
  mobileMoney: string;

  @Column({ nullable: true })
  taxId: string;

  @Column()
  contactPerson: string;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  suspendedReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
