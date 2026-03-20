import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface SavedCartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

@Entity('saved_carts')
export class SavedCart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  customerId: string;

  @Column()
  customerName: string;

  @Column({ type: 'jsonb' })
  items: SavedCartItem[];

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  branchId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
