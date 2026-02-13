import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsISO4217CurrencyCode,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCurrencyDto {
  @ApiProperty({
    description: 'Code ISO de la devise (3 lettres)',
    example: 'XOF',
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  @IsISO4217CurrencyCode()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  code: string;

  @ApiProperty({
    description: 'Nom de la devise',
    example: 'Franc CFA',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Symbole de la devise',
    example: 'FCFA',
    maxLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  symbol: string;

  @ApiPropertyOptional({
    description: 'Taux de change par rapport à la devise par défaut',
    example: 1,
    default: 1,
    minimum: 0.0001,
  })
  @IsNumber()
  @Min(0.0001)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  rate?: number;

  @ApiPropertyOptional({
    description: 'Devise par défaut',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Statut actif/inactif',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
