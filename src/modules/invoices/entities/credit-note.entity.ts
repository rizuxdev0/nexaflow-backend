import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

export enum CreditNoteStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  APPLIED = 'applied',
  CANCELLED = 'cancelled',
}

@Entity('credit_notes')
export class CreditNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  creditNoteNumber: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  invoiceId: string;

  @Column()
  invoiceNumber: string;

  @Column({ nullable: true })
  customerId: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb' })
  items: any[];

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  taxTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: CreditNoteStatus,
    default: CreditNoteStatus.ISSUED,
  })
  status: CreditNoteStatus;

  @Column({ nullable: true })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
