import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customerId: string;

  @Column()
  type: string; // 'earn' | 'redeem' | 'bonus' | 'expire'

  @Column({ type: 'int' })
  points: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  rewardId: string;

  @CreateDateColumn()
  createdAt: Date;
}
