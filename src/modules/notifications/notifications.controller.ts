import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, NotificationFilterDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Get()
  findAll(@Query() query: NotificationFilterDto, @CurrentUser('id') userId: string) {
    // If not superadmin, automatically filter by user's notifications
    // For simplicity, we assume frontend provides correct filter based on context
    return this.notificationService.findAll(query);
  }

  @Get('my') // Fetch current user's notifications
  findMy(@CurrentUser('id') userId: string, @Query('isRead') isRead?: boolean) {
    return this.notificationService.findAll({ userId, isRead });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard) // Only admins can create manual notifications
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllRead(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }
}
