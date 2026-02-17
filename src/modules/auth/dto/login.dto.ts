import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email', example: 'superadmin@nexaflow.com' })
  // @ApiProperty({ description: 'Email', example: 'jean.dupont@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Mot de passe', example: 'super123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
