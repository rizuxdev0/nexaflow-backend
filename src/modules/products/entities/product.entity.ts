import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { ProductVariant } from './product-variant.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';

export enum ProductApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DRAFT = 'draft',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 200 })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  shortDescription: string;

  @Column({ unique: true, length: 50, nullable: true })
  sku: string;

  @Column({ nullable: true, length: 100 })
  barcode: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ nullable: true })
  supplierId: string;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  compareAtPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 18 })
  taxRate: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  minStock: number;

  @Column({ default: 100 })
  maxStock: number;

  @Column({ default: 'pièce' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight: number;

  @Column({ nullable: true })
  weightUnit: string;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: {
    length: number;
    width: number;
    height: number;
  };

  @Column({ nullable: true })
  brand: string;

  @Column({ type: 'simple-array' })
  images: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  salesCount: number;

  @Column({ default: false })
  isHeroFeatured: boolean;

  @Column({ default: 1 })
  heroPriority: number;

  @Column({ type: 'jsonb', nullable: true })
  wholesaleTiers: { minQuantity: number; price: number; discount: number }[];

  @Column({ type: 'jsonb', nullable: true })
  translations: {
    [lang: string]: {
      name?: string;
      description?: string;
      shortDescription?: string;
    };
  };

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ nullable: true })
  vendorId: string;

  @Column({
    type: 'enum',
    enum: ProductApprovalStatus,
    default: ProductApprovalStatus.APPROVED, // Default to approved for legacy internal products
  })
  approvalStatus: ProductApprovalStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
