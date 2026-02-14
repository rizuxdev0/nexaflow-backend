import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  IsUrl,
  ValidateNested,
  IsObject,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class DimensionsDto {
  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  length?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  width?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  height?: number;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Nom du produit',
    example: 'Smartphone Samsung Galaxy S23',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Description complète',
    example: 'Description détaillée...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Description courte',
    example: 'Smartphone haut de gamme',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @ApiProperty({ description: 'SKU unique', example: 'SMS-S23-BLK-128' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiPropertyOptional({ description: 'Code-barres', example: '1234567890123' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @ApiProperty({ description: 'ID de la catégorie' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ description: 'ID du fournisseur' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ description: 'Prix de vente', example: 250000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ description: "Prix d'achat", example: 200000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPrice: number;

  @ApiPropertyOptional({ description: 'Prix barré', example: 300000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  compareAtPrice?: number;

  @ApiPropertyOptional({
    description: 'Taux de TVA (%)',
    example: 18,
    default: 18,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Stock initial',
    example: 50,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ description: 'Stock minimum', example: 5, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Stock maximum',
    example: 200,
    default: 100,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxStock?: number;

  @ApiPropertyOptional({
    description: 'Unité de mesure',
    example: 'pièce',
    default: 'pièce',
  })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'Poids', example: 0.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({ description: 'Unité de poids', example: 'kg' })
  @IsString()
  @IsOptional()
  weightUnit?: string;

  @ApiPropertyOptional({ description: 'Dimensions' })
  @IsObject()
  @ValidateNested()
  @Type(() => DimensionsDto)
  @IsOptional()
  dimensions?: DimensionsDto;

  @ApiPropertyOptional({ description: 'Marque', example: 'Samsung' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Images',
    example: ['https://example.com/image1.jpg'],
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    description: 'Tags',
    example: ['smartphone', 'samsung', '5g'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Produit en vedette', default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
