import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEmail, IsUUID } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsUUID()
  @IsOptional()
  managerId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isMain?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
