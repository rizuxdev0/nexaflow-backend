import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  WAVE = 'wave',
  MANUAL = 'manual',
}

@Entity('payments')
@Index(['orderId'])
@Index(['provider', 'status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.STRIPE })
  provider: PaymentProvider;

  @Column({ name: 'provider_payment_id', nullable: true })
  providerPaymentId: string; // e.g. pi_xxx from Stripe

  @Column({ name: 'provider_session_id', nullable: true })
  providerSessionId: string; // e.g. cs_xxx for Checkout

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'bigint' })
  amount: number; // in smallest unit (cents, centimes, etc.)

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'amount_refunded', type: 'bigint', default: 0 })
  amountRefunded: number;

  @Column({ name: 'client_secret', nullable: true })
  clientSecret: string; // for frontend Stripe Elements

  @Column({ name: 'checkout_url', nullable: true })
  checkoutUrl: string; // for hosted Checkout redirect

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
