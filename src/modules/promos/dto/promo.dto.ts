import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsUUID, IsArray, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { PromoType } from '../entities/promo.entity';

export class CreatePromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(PromoType)
  @IsNotEmpty()
  type: PromoType;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  value: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  usageLimit?: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @IsDateString()
  @IsNotEmpty()
  endDate: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  applicableProducts?: string[];

  @IsArray()
  @IsOptional()
  applicableCategories?: string[];
}

export class ValidatePromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  orderAmount: number;

  @IsArray()
  @IsOptional()
  items?: { productId: string; categoryId: string; quantity: number; price: number }[];
}
