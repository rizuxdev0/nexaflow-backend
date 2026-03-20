import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  @IsNotEmpty()
  exchangeRate: number;

  @IsBoolean()
  @IsOptional()
  isBase?: boolean;
}

export class UpdateCurrencyDto extends CreateCurrencyDto {}
