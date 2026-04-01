import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'XOF' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Franc CFA' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'FCFA' })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @IsNotEmpty()
  exchangeRate: number;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isBase?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {}
