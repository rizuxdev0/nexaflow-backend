import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
