import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { BundleItem } from '../entities/package.entity';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsArray()
  @IsNotEmpty()
  items: BundleItem[];

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  originalPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  bundlePrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  savingsPercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @IsDateString()
  @IsNotEmpty()
  endDate: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePackageDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
