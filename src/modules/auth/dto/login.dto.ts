import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email', example: 'superadmin@nexaflow.com' })
  // @ApiProperty({ description: 'Email', example: 'jean.dupont@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Source de la connexion', example: 'admin', required: false })
  @IsString()
  @IsOptional()
  source?: 'admin' | 'ecommerce';
}
