import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email', example: 'jean.dupont@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
