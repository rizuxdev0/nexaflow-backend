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
  findAll(
    @Query() query: NotificationFilterDto,
    @CurrentUser() user: any
  ) {
    const isCustomer = user.roles?.includes('customer');
    
    if (isCustomer) {
      // Shoppers: see only their own and never admin notifications
      query.customerId = user.id;
      // Force null/undefined for userId filter in query to ensure isolation
      return this.notificationService.findAll({ ...query, customerId: user.id, userId: undefined });
    } else {
      // Admins: see general, or their own, or everything if they have permissions
      // We'll let the service handle the expanded fetch for admins
      return this.notificationService.findAll(query, true);
    }
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

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: any) {
    const isCustomer = user.role?.name === 'customer' || user.role === 'customer';
    if (isCustomer) {
      return this.notificationService.markAllRead(undefined, user.id);
    }
    return this.notificationService.markAllRead(user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }
}
