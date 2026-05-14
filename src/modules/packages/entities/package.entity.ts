import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';

export interface BundleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

@Entity('product_bundles')
export class ProductBundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  items: BundleItem[];

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  bundlePrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  savingsPercent: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isHeroFeatured: boolean;

  @Column({ default: 1 })
  heroPriority: number;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ nullable: true })
  vendorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
