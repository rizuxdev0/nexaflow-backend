import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { OpenCashRegisterDto, CreateCashMovementDto, CreateCashRegisterDto } from './dto/cash-register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('cash-registers')
@ApiBearerAuth()
@Controller('cash-registers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CashRegistersController {
  constructor(private readonly cashService: CashRegistersService) {}

  @Get()
  @Permissions('cash.read')
  findAll(@Query('branchId') branchId?: string) {
    return this.cashService.findAll(branchId);
  }

  @Get(':id')
  @Permissions('cash.read')
  findOne(@Param('id') id: string) {
    return this.cashService.findOne(id);
  }

  @Post(':id/open')
  @Permissions('cash.update')
  open(@Param('id') id: string, @Body() dto: OpenCashRegisterDto, @CurrentUser('id') userId: string) {
    return this.cashService.openRegister(id, dto.openingBalance, userId);
  }

  @Post(':id/close')
  @Permissions('cash.update')
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.cashService.closeRegister(id, userId);
  }

  @Post(':id/movements')
  @Permissions('cash.update')
  record(@Param('id') id: string, @Body() dto: CreateCashMovementDto, @CurrentUser('id') userId: string) {
    return this.cashService.recordMovement(id, dto.type, dto.amount, dto.reason, userId, dto.orderId);
  }

  @Get(':id/movements')
  @Permissions('cash.read')
  getMovements(@Param('id') id: string, @Query('page') page: number, @Query('pageSize') pageSize: number) {
    return this.cashService.getMovements(id, page, pageSize);
  }
}
