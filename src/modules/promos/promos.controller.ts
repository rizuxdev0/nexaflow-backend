import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto, ValidatePromoDto } from './dto/promo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('promos')
@ApiBearerAuth()
@Controller('promos')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Get()
  @Permissions('promos.read')
  findAll(@Query() query: any) {
    return this.promosService.findAll(query);
  }

  @Get(':id')
  @Permissions('promos.read')
  findOne(@Param('id') id: string) {
    return this.promosService.findOne(id);
  }

  @Post('validate')
  @Public() // Allow checkout from public users
  validate(@Body() dto: ValidatePromoDto) {
    return this.promosService.validateCode(dto);
  }

  @Post()
  @Permissions('promos.update')
  create(@Body() dto: CreatePromoDto) {
    return this.promosService.create(dto);
  }

  @Put(':id')
  @Permissions('promos.update')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePromoDto>) {
    return this.promosService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('promos.delete')
  remove(@Param('id') id: string) {
    return this.promosService.remove(id);
  }
}
