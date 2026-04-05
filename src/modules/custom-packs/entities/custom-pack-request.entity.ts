import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('custom_pack_requests')
export class CustomPackRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string; // This stores the User ID from the ecommerce front

  @Column()
  customerName: string;

  @Column()
  customerEmail: string;

  @Column('jsonb')
  items: any[];

  @Column('float')
  originalTotal: number;

  @Column()
  discountType: 'percentage' | 'fixed';

  @Column('float')
  discountValue: number;

  @Column('float')
  discountedTotal: number;

  @Column('float')
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

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: User;
}
