import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('custom_pack_requests_v2')
export class CustomPackRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  customerId: string; // This stores the Customer ID from the ecommerce front

  @Column()
  customerName: string;

  @Column()
  customerEmail: string;

  @Column('jsonb', { nullable: true })
  items: any[];

  @Column('float', { nullable: true })
  originalTotal: number;

  @Column({ nullable: true })
  discountType: 'percentage' | 'fixed';

  @Column('float', { nullable: true })
  discountValue: number;

  @Column('float', { nullable: true })
  discountedTotal: number;

  @Column('float', { nullable: true })
  savings: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'converted';

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  customerNote: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @CreateDateColumn()
  reviewedAt: Date;

  @Column({ nullable: true })
  convertedOrderId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /*
  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;
  */
}
