import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  customerId: string;

  @Column()
  customerName: string;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column()
  title: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @Column({ default: 0 })
  helpful: number;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'jsonb', nullable: true })
  reply: {
    text: string;
    repliedAt: string;
    repliedBy: string;
  };

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'approved' | 'rejected'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
