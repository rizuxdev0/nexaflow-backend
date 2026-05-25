import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentProvider {
  STRIPE = 'stripe',
  WAVE = 'wave',
  MANUAL = 'manual',
}

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Amount in smallest currency unit (e.g. cents)', example: 15000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'EUR' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Linked order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Custom metadata' })
  @IsOptional()
  metadata?: Record<string, string>;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Linked order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Total amount in smallest currency unit', example: 15000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'EUR' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Product name displayed on checkout', example: 'Commande #1042' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ description: 'URL to redirect to on success' })
  @IsString()
  successUrl: string;

  @ApiProperty({ description: 'URL to redirect to on cancel' })
  @IsString()
  cancelUrl: string;
}

export class CreateRefundDto {
  @ApiProperty({ description: 'Stripe PaymentIntent ID' })
  @IsString()
  paymentIntentId: string;

  @ApiPropertyOptional({ description: 'Amount to refund in cents (full refund if omitted)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}
