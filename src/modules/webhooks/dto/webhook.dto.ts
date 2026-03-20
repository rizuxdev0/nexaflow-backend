import { IsString, IsNotEmpty, IsUrl, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateWebhookDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  events: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWebhookDto extends CreateWebhookDto {}
