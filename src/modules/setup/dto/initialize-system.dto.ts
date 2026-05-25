import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, IsObject } from 'class-validator';

export class InitializeSystemDto {
  // --- Admin Info ---
  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @IsString()
  @IsNotEmpty()
  adminLastName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  // --- Company Info ---
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsString()
  @IsOptional()
  storeSlogan?: string;

  @IsString()
  @IsNotEmpty()
  contactEmail: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsString()
  @IsNotEmpty()
  contactAddress: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  // --- Localization ---
  @IsString()
  @IsNotEmpty()
  currencyCode: string; // e.g. XOF

  @IsString()
  @IsNotEmpty()
  currencySymbol: string; // e.g. FCFA

  @IsString()
  @IsNotEmpty()
  timezone: string; // e.g. Africa/Abidjan

  @IsString()
  @IsNotEmpty()
  language: string; // fr, en...

  // --- Initial Config ---
  @IsObject()
  @IsOptional()
  features?: Record<string, boolean>;
}
