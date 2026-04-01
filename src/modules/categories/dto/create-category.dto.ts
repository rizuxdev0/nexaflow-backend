import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nom de la catégorie',
    example: 'Électronique',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Description de la catégorie',
    example: 'Produits électroniques et gadgets',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'ID de la catégorie parente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: "URL de l'image",
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    description: 'Statut actif/inactif',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Traductions de la catégorie',
    example: { fr: { name: 'Électronique' }, en: { name: 'Electronics' } },
  })
  @IsObject()
  @IsOptional()
  translations?: { [lang: string]: { name?: string; description?: string } };

  @ApiPropertyOptional({
    description: 'Attributs personnalisés pour les produits de cette catégorie',
    example: [{ name: 'Taille', key: 'size', type: 'select' }],
  })
  @IsArray()
  @IsOptional()
  customAttributes?: any[];
}
