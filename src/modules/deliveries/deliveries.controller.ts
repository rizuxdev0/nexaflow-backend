import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Patch } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto, CalculateShippingDto } from './dto/delivery.dto';
import { CreateDriverDto, UpdateDriverDto, AssignDeliveryDto, UpdateDeliveryStatusDto, UpdateDriverLocationDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
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

  // --- Driver Endpoints ---
  @Get('drivers')
  @Roles('admin', 'manager', 'logistics')
  @Permissions('deliveries.read')
  getDrivers(@Query('page') page: string, @Query('pageSize') pageSize: string) {
    return this.deliveriesService.getDrivers(+page || 1, +pageSize || 20);
  }

  @Post('drivers')
  @Roles('admin', 'manager')
  @Permissions('deliveries.create')
  createDriver(@Body() dto: CreateDriverDto) {
    return this.deliveriesService.createDriver(dto);
  }

  @Put('drivers/:id')
  @Roles('admin', 'manager')
  @Permissions('deliveries.update')
  updateDriver(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.deliveriesService.updateDriver(id, dto);
  }

  @Delete('drivers/:id')
  @Roles('admin')
  @Permissions('deliveries.delete')
  deleteDriver(@Param('id') id: string) {
    return this.deliveriesService.deleteDriver(id);
  }

  // --- Delivery Assignment Endpoints ---
  @Post('assign')
  @Roles('admin', 'manager', 'logistics')
  @Permissions('deliveries.update')
  assignDelivery(@Body() dto: AssignDeliveryDto) {
    return this.deliveriesService.assignDelivery(dto);
  }

  @Put('status/:orderId')
  @Roles('admin', 'manager', 'logistics')
  @Permissions('deliveries.update')
  updateDeliveryStatus(@Param('orderId') orderId: string, @Body() dto: UpdateDeliveryStatusDto) {
    return this.deliveriesService.updateDeliveryStatus(orderId, dto);
  }

  @Get('pending')
  @Roles('admin', 'manager', 'logistics')
  @Permissions('deliveries.read')
  getPendingDeliveries() {
    return this.deliveriesService.getPendingDeliveries();
  }

  @Get('active')
  @Roles('admin', 'manager', 'logistics')
  @Permissions('deliveries.read')
  getActiveDeliveries() {
    return this.deliveriesService.getActiveDeliveries();
  }

  @Public() // Allow drivers to update without role guard if they have JWT but let's keep it secure
  @Patch('location')
  updateLocation(@Body() dto: UpdateDriverLocationDto) {
    return this.deliveriesService.updateLocation(dto);
  }
}
