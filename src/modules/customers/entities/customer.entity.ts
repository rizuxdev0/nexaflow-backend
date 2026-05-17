import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column()
  email: string;

  @Column({ nullable: true, length: 30 })
  phone: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ nullable: true, length: 100 })
  city: string;

  @Column({ nullable: true, length: 100 })
  country: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ default: 0 })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  totalSpent: number;

  @Column({ default: 0 })
  loyaltyPoints: number;

  @Column({ default: 0 })
  lifetimePoints: number;

  @Column({ default: 'bronze' })
  loyaltyTier: string;

  @Column({ default: 'pos' })
  source: string; // 'pos' or 'ecommerce'

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastOrderDate: Date;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ nullable: true })
  vendorId: string;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Propriété calculée
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
