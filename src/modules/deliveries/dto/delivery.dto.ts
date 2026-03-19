import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EstimatedDaysDto {
  @IsNumber() min: number;
  @IsNumber() max: number;
}

export class CreateDeliveryZoneDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() code: string;
  @IsArray() cities: string[];
  @IsNumber() baseFee: number;
  @IsNumber() @IsOptional() freeAbove?: number;
  
  @ValidateNested()
  @Type(() => EstimatedDaysDto)
  estimatedDays: EstimatedDaysDto;
  
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsNumber() @IsOptional() weightSurcharge?: number;
}

import { PartialType } from '@nestjs/swagger';
export class UpdateDeliveryZoneDto extends PartialType(CreateDeliveryZoneDto) {}

export class CalculateShippingDto {
  @IsString() @IsNotEmpty() city: string;
  @IsNumber() @IsNotEmpty() orderTotal: number;
  @IsNumber() @IsOptional() totalWeight?: number;
}
