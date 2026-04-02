import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto, UpdateBatchStatusDto, ConsumeBatchDto, SplitBatchDto, TransferBatchDto, QualityCheckDto } from './dto/batch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('batches')
@ApiBearerAuth()
@Controller('batches')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @Permissions('stock.read')
  findAll(@Query() query: any) {
    return this.batchesService.findAll(query);
  }

  @Get('stats')
  @Permissions('stock.read')
  getStats() {
    return this.batchesService.getStats();
  }

  @Get('expiring-soon')
  @Permissions('stock.read')
  getExpiringSoon(@Query('days') days?: number) {
    return this.batchesService.getExpiringSoon(days || 30);
  }

  @Get('expired')
  @Permissions('stock.read')
  getExpired() {
    return this.batchesService.getExpired();
  }

  @Get(':id')
  @Permissions('stock.read')
  getById(@Param('id') id: string) {
    return this.batchesService.getById(id);
  }

  @Get('product/:productId')
  @Permissions('stock.read')
  getByProduct(@Param('productId') productId: string) {
    return this.batchesService.getByProduct(productId);
  }

  @Post()
  @Permissions('stock.update')
  create(@Body() dto: CreateBatchDto) {
    return this.batchesService.create(dto);
  }

  @Patch(':id/status')
  @Permissions('stock.update')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBatchStatusDto) {
    return this.batchesService.updateStatus(id, dto);
  }

  @Patch(':id/consume')
  @Permissions('stock.update')
  consume(@Param('id') id: string, @Body() dto: ConsumeBatchDto) {
    return this.batchesService.consume(id, dto);
  }

  @Post(':id/split')
  @Permissions('stock.update')
  split(@Param('id') id: string, @Body() dto: SplitBatchDto) {
    return this.batchesService.split(id, dto);
  }

  @Patch(':id/transfer')
  @Permissions('stock.update')
  transfer(@Param('id') id: string, @Body() dto: TransferBatchDto) {
    return this.batchesService.transfer(id, dto);
  }

  @Post(':id/quality-check')
  @Permissions('stock.update')
  qualityCheck(@Param('id') id: string, @Body() dto: QualityCheckDto) {
    return this.batchesService.qualityCheck(id, dto);
  }

  @Post('expired/mark')
  @Permissions('stock.update')
  markExpired() {
    return this.batchesService.markExpired();
  }
}
