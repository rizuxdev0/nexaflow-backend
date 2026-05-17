import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('invoice_numbering_config')
export class InvoiceNumberingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  vendorId: string;

  @Column({ default: 'FAC' })
  prefix: string;

  @Column({ default: '-' })
  separator: string;

  @Column({ default: true })
  includeYear: boolean;

  @Column({ default: true })
  includeMonth: boolean;

  @Column({ default: 4 })
  padLength: number;

  @Column({ default: 1 })
  nextSequence: number;

  @Column({ default: 'AV' })
  creditNotePrefix: string;

  @Column({ default: 1 })
  nextCreditNoteSequence: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
