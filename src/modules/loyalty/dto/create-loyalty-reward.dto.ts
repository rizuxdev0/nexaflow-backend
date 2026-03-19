import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoyaltyRewardDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiProperty() @IsNumber() pointsCost: number;
  @ApiProperty() @IsString() @IsIn(['discount_percent', 'discount_fixed', 'free_shipping', 'gift']) type: string;
  @ApiProperty() @IsNumber() value: number;
  @ApiPropertyOptional() @IsString() @IsOptional() image?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() stock?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
