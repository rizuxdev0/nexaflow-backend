import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsDateString, Min, ValidateNested, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SavedCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  unitPrice: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isBundle?: boolean;
}

export class CreateSavedCartDto {
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavedCartItemDto)
  @IsNotEmpty()
  items: SavedCartItemDto[];

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  totalAmount: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
