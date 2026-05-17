import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterBusinessDto {
  // Informations de l'utilisateur (Admin)
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'admin@ma-boutique.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+221770000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  // Informations de l'entreprise (Vendor)
  @ApiProperty({ example: 'Ma Boutique SARL' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'Dakar, Plateau' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Sénégal' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Dakar' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'starter' })
  @IsString()
  @IsOptional()
  planCode?: string;
}
