import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto, CalculateShippingDto } from './dto/delivery.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('delivery')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('zones')
  @Roles('admin', 'manager')
  @Permissions('deliveries.read')
  getZones(@Query('page') page: string, @Query('pageSize') pageSize: string) {
    return this.deliveriesService.getZones(+page || 1, +pageSize || 20);
  }

  @Public() // Public to let checkout flows see zones
  @Get('zones/all')
  getAllZones() {
    return this.deliveriesService.getAllZones();
  }

  @Public() // Public to let checkout flows calculate shipping
  @Post('calculate')
  calculateShipping(@Body() dto: CalculateShippingDto) {
    return this.deliveriesService.calculateShipping(dto);
  }

  @Post('zones')
  @Roles('admin', 'manager')
  @Permissions('deliveries.create')
  createZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.deliveriesService.createZone(dto);
  }

  @Put('zones/:id')
  @Roles('admin', 'manager')
  @Permissions('deliveries.update')
  updateZone(@Param('id') id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.deliveriesService.updateZone(id, dto);
  }

  @Delete('zones/:id')
  @Roles('admin', 'manager')
  @Permissions('deliveries.delete')
  deleteZone(@Param('id') id: string) {
    return this.deliveriesService.deleteZone(id);
  }
}
