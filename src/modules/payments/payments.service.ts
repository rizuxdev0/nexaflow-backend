import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from './providers/stripe.service';
import { Payment, PaymentStatus, PaymentProvider } from './entities/payment.entity';
import {
  CreatePaymentIntentDto,
  CreateCheckoutSessionDto,
  CreateRefundDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly stripeService: StripeService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  //  CREATE PAYMENT INTENT (for Stripe Elements on frontend)
  // ─────────────────────────────────────────────────────────────────
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const intent = await this.stripeService.createPaymentIntent(
      dto.amount,
      dto.currency,
      { ...(dto.metadata || {}), ...(dto.orderId ? { orderId: dto.orderId } : {}) },
    );

    const payment = this.paymentRepo.create({
      orderId: dto.orderId,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: intent.id,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      clientSecret: intent.client_secret,
      metadata: dto.metadata,
    });

    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      clientSecret: intent.client_secret,
      providerPaymentId: intent.id,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  CREATE CHECKOUT SESSION (hosted Stripe page)
  // ─────────────────────────────────────────────────────────────────
  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    const session = await this.stripeService.createCheckoutSession(
      [
        {
          price_data: {
            currency: dto.currency.toLowerCase(),
            product_data: {
              name: dto.productName || `Commande #${dto.orderId}`,
            },
            unit_amount: dto.amount,
          },
          quantity: 1,
        },
      ],
      dto.successUrl,
      dto.cancelUrl,
      { orderId: dto.orderId },
    );

    const payment = this.paymentRepo.create({
      orderId: dto.orderId,
      provider: PaymentProvider.STRIPE,
      providerSessionId: session.id,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      checkoutUrl: session.url,
    });

    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  REFUND
  // ─────────────────────────────────────────────────────────────────
  async refund(dto: CreateRefundDto) {
    const payment = await this.paymentRepo.findOne({
      where: { providerPaymentId: dto.paymentIntentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED)
      throw new BadRequestException('Only succeeded payments can be refunded');

    const refund = await this.stripeService.createRefund(dto.paymentIntentId, dto.amount);

    payment.amountRefunded += refund.amount;
    payment.status =
      payment.amountRefunded >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await this.paymentRepo.save(payment);

    return { refundId: refund.id, status: refund.status, amount: refund.amount };
  }

  // ─────────────────────────────────────────────────────────────────
  //  WEBHOOK HANDLER (called from controller, raw body)
  // ─────────────────────────────────────────────────────────────────
  async handleStripeWebhook(payload: Buffer, signature: string) {
    let event: any;
    try {
      event = this.stripeService.constructWebhookEvent(payload, signature);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await this.paymentRepo.update(
          { providerPaymentId: pi.id },
          { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
        );
        this.logger.log(`PaymentIntent ${pi.id} succeeded`);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await this.paymentRepo.update(
          { providerPaymentId: pi.id },
          {
            status: PaymentStatus.FAILED,
            failureReason: pi.last_payment_error?.message,
          },
        );
        this.logger.warn(`PaymentIntent ${pi.id} failed`);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.paymentRepo.update(
          { providerSessionId: session.id },
          { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
        );
        this.logger.log(`Checkout Session ${session.id} completed`);
        break;
      }
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  // ─────────────────────────────────────────────────────────────────
  //  QUERIES
  // ─────────────────────────────────────────────────────────────────
  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.paymentRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findByOrder(orderId: string) {
    return this.paymentRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }
}
