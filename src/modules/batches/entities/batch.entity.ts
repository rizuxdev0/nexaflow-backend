import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

export enum BatchStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RECALLED = 'recalled',
  QUARANTINE = 'quarantine',
}

@Entity('product_batches')
export class ProductBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column()
  productName: string; // Redundant for easy search in FE

  @Column({ unique: true })
  batchNumber: string;

  @Column({ type: 'simple-array', nullable: true })
  serialNumbers: string[];

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  remainingQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costPrice: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column()
  warehouseId: string;

  @Column({ nullable: true })
  warehouseName: string; // Redundant

  @Column({ nullable: true })
  manufacturingDate: Date;

  @Column({ nullable: true })
  expirationDate: Date;

  @Column()
  receivedDate: Date;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  supplierName: string; // Redundant

  @Column({
    type: 'enum',
    enum: BatchStatus,
    default: BatchStatus.ACTIVE,
  })
  status: BatchStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
