import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  code: string; // e.g. USD, EUR, FCFA

  @Column({ nullable: true })
  name: string; // e.g. Dollar, Euro, Franc CFA

  @Column({ nullable: true })
  symbol: string; // e.g. $, €, F

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  exchangeRate: number; // Rate relative to base currency (1.0)

  @Column({ default: false })
  isBase: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
