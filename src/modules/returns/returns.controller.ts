import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto, UpdateReturnStatusDto } from './dto/return.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('returns')
@ApiBearerAuth()
@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @Permissions('orders.read')
  findAll(@Query() query: any) {
    return this.returnsService.findAll(query);
  }

  @Get(':id')
  @Permissions('orders.read')
  findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Post()
  @Permissions('orders.update')
  create(@Body() dto: CreateReturnDto) {
    return this.returnsService.create(dto);
  }

  @Patch(':id/status')
  @Permissions('orders.update')
  updateStatus(
    @Param('id') id: string, 
    @Body() dto: UpdateReturnStatusDto,
    @CurrentUser('id') userId: string
  ) {
    return this.returnsService.updateStatus(id, dto, userId);
  }
}
