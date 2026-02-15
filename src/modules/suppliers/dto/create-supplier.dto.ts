import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsUrl,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Nom du fournisseur',
    example: 'Tech Distribution SARL',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Code unique du fournisseur',
    example: 'FOUR001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Nom du contact', example: 'Jean Dupont' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @ApiPropertyOptional({
    description: 'Statut actif/inactif',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Email du contact',
    example: 'contact@techdistrib.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Téléphone', example: '+221 77 123 45 67' })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Adresse complète',
    example: '15 Rue des Entrepreneurs',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Ville', example: 'Dakar' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Pays', example: 'Sénégal' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({
    description: 'Site web',
    example: 'https://techdistrib.com',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Fournisseur principal pour électronique',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Note moyenne',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}
