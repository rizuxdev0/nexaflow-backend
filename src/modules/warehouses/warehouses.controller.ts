import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { QuotaGuard, CheckQuota } from '../../common/guards/quota.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @Permissions('warehouses.read')
  findAll(@Query() query: any) {
    return this.warehousesService.findAll(query);
  }

  @Get(':id')
  @Permissions('warehouses.read')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @Permissions('warehouses.create')
  @UseGuards(QuotaGuard)
  @CheckQuota('warehouses')
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @Permissions('warehouses.update')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @Permissions('warehouses.delete')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }
}
