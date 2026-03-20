import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { InventoriesService } from './inventories.service';
import { CreateInventoryDto, UpdateInventoryStatusDto, UpdateInventoryItemsDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('inventories')
@ApiBearerAuth()
@Controller('inventories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Get()
  @Permissions('stock.read')
  findAll(@Query() query: any) {
    return this.inventoriesService.findAll(query);
  }

  @Get(':id')
  @Permissions('stock.read')
  findOne(@Param('id') id: string) {
    return this.inventoriesService.findOne(id);
  }

  @Post()
  @Permissions('stock.update')
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoriesService.create(dto);
  }

  @Post('auto/:warehouseId')
  @Permissions('stock.update')
  auto(@Param('warehouseId') warehouseId: string) {
    return this.inventoriesService.autoGenerate(warehouseId);
  }

  @Put(':id/items')
  @Permissions('stock.update')
  updateItems(@Param('id') id: string, @Body() dto: UpdateInventoryItemsDto) {
    return this.inventoriesService.updateItems(id, dto);
  }

  @Patch(':id/status')
  @Permissions('stock.update')
  updateStatus(
    @Param('id') id: string, 
    @Body() dto: UpdateInventoryStatusDto,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoriesService.updateStatus(id, dto, userId);
  }
}
