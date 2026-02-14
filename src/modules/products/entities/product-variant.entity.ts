import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  compareAtPrice: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  material: string;

  @Column({ type: 'simple-array' })
  images: string[];

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Product, (product) => product.variants)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
