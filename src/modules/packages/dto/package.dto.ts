import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
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
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isHeroFeatured?: boolean;

  @IsNumber()
  @IsOptional()
  heroPriority?: number;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {}
