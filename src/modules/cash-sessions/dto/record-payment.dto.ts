import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  MIXED = 'mixed',
}

export class RecordPaymentDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Méthode de paiement' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Montant', example: 25000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
