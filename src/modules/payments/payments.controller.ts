import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Headers,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentIntentDto,
  CreateCheckoutSessionDto,
  CreateRefundDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Stripe Elements flow ───────────────────────────────────────────
  @Post('create-intent')
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent (for Elements)' })
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  // ── Stripe Checkout flow ──────────────────────────────────────────
  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create a hosted Stripe Checkout Session' })
  createCheckout(@Body() dto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  // ── Refund ────────────────────────────────────────────────────────
  @Post('refund')
  @ApiOperation({ summary: 'Issue a full or partial refund via Stripe' })
  refund(@Body() dto: CreateRefundDto) {
    return this.paymentsService.refund(dto);
  }

  // ── Webhook (Public — no JWT, uses Stripe signature) ─────────────
  @Post('webhook/stripe')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint (must NOT be secured by JWT)' })
  stripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody as Buffer, signature);
  }

  // ── Queries ───────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all payments (paginated)' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.findAll(page, limit);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all payments for a specific order' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single payment by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}
