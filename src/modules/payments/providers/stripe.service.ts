import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');

@Injectable()
export class StripeService {
  private readonly stripe: any;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
    }
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2026-04-22.dahlia',
    });
  }

  /** Create a PaymentIntent for a given amount (amount in smallest currency unit) */
  async createPaymentIntent(
    amountInCents: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<any> {
    return this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: metadata || {},
    });
  }

  /** Retrieve a PaymentIntent */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /** Create a hosted Stripe Checkout Session */
  async createCheckoutSession(
    lineItems: any[],
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>,
  ): Promise<any> {
    return this.stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });
  }

  /** Create a Refund */
  async createRefund(paymentIntentId: string, amountInCents?: number): Promise<any> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountInCents && { amount: amountInCents }),
    });
  }

  /** Verify and construct a Stripe webhook event */
  constructWebhookEvent(payload: Buffer, signature: string): any {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
