import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  location: string;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  assignedUserId?: string;

  @ApiProperty()
  activeSession?: {
    id: string;
    openedAt: Date;
    user: any;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
