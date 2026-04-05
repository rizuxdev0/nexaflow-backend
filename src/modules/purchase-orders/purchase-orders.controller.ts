import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  @Permissions('suppliers.read')
  findAll(@Query() query: any) {
    return this.poService.findAll(query);
  }

  @Get('suggestions')
  @Permissions('suppliers.read')
  getSuggestions() {
    return this.poService.getSuggestions();
  }

  @Get(':id')
  @Permissions('suppliers.read')
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Post()
  @Permissions('suppliers.update')
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.poService.create(dto);
  }

  @Patch(':id/status')
  @Permissions('suppliers.update')
  updateStatus(
    @Param('id') id: string, 
    @Body() dto: UpdatePurchaseOrderStatusDto,
    @CurrentUser('id') userId: string
  ) {
    return this.poService.updateStatus(id, dto, userId);
  }

  @Post(':id/receive')
  @Permissions('suppliers.update')
  receive(
    @Param('id') id: string, 
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser('id') userId: string
  ) {
    return this.poService.receive(id, dto, userId);
  }

}
