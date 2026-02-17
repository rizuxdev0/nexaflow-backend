import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateVariantDto {
  @ApiProperty({
    description: 'SKU unique de la variante',
    example: 'SMS-S23-BLK-128',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  sku: string;

  @ApiProperty({
    description: 'Nom de la variante',
    example: 'Samsung Galaxy S23 Noir 128Go',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Taille', example: 'M' })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ description: 'Couleur', example: 'Noir' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Matériau', example: 'Cuir' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiPropertyOptional({ description: 'Poids (kg)', example: 0.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({ description: 'Modificateur de prix', example: 5000 })
  @IsNumber()
  @Min(-1000000)
  @IsOptional()
  @Type(() => Number)
  priceModifier?: number;

  @ApiPropertyOptional({
    description: 'Stock initial',
    example: 10,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ description: 'Images de la variante', type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Variante active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
