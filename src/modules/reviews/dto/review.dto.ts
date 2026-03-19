import { IsString, IsNotEmpty, IsNumber, Min, Max, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class CreateReviewDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsNotEmpty() customerName: string;
  @IsNumber() @Min(1) @Max(5) rating: number;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() comment: string;
  @IsBoolean() @IsOptional() isVerifiedPurchase?: boolean;
  @IsArray() @IsOptional() images?: string[];
}

export class ModerateReviewDto {
  @IsString() @IsNotEmpty() status: string; // 'approved' | 'rejected'
}

export class ReplyReviewDto {
  @IsString() @IsNotEmpty() text: string;
}
