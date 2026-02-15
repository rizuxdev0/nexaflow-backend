import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column()
  productSku: string;

  @Column({ nullable: true })
  variantId: string;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 18 })
  taxRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  taxAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
