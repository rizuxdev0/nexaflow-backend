import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WebhooksController {
  constructor(private readonly webhookService: WebhooksService) {}

  @Get()
  @Permissions('settings.read')
  findAll() {
    return this.webhookService.findAll();
  }

  @Get(':id')
  @Permissions('settings.read')
  findOne(@Param('id') id: string) {
    return this.webhookService.findOne(id);
  }

  @Post()
  @Permissions('settings.update')
  create(@Body() dto: CreateWebhookDto) {
    return this.webhookService.create(dto);
  }

  @Put(':id')
  @Permissions('settings.update')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings.delete')
  remove(@Param('id') id: string) {
    return this.webhookService.remove(id);
  }
}
