import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ShopPaymentMethod {
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  CASH_ON_DELIVERY = 'cash_on_delivery',
}

class ShopOrderItemDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantité', example: 2 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateShopOrderDto {
  @ApiPropertyOptional({ description: 'ID du client existant' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Nom du client', example: 'Jean Dupont' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiPropertyOptional({
    description: 'Email du client',
    example: 'jean@email.com',
  })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Téléphone du client',
    example: '+221 77 123 45 67',
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Adresse de livraison' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsString()
  @IsOptional()
  shippingCity?: string;

  @ApiPropertyOptional({ description: 'Pays' })
  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @ApiProperty({ enum: ShopPaymentMethod, description: 'Méthode de paiement' })
  @IsEnum(ShopPaymentMethod)
  paymentMethod: ShopPaymentMethod;

  @ApiPropertyOptional({ description: 'Notes pour la commande' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [ShopOrderItemDto], description: 'Articles commandés' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShopOrderItemDto)
  items: ShopOrderItemDto[];
}
