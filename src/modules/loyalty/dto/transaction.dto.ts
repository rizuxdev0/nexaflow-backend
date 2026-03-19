import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class EarnPointsDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsNumber() points: number;
  @IsString() @IsNotEmpty() orderId: string;
}

export class RedeemRewardDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsNotEmpty() rewardId: string;
}
