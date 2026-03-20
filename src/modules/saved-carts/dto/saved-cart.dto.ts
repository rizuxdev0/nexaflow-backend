import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsUUID, IsArray, IsDateString, Min } from 'class-validator';
import { SavedCartItem } from '../entities/saved-cart.entity';

export class CreateSavedCartDto {
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsArray()
  @IsNotEmpty()
  items: SavedCartItem[];

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
