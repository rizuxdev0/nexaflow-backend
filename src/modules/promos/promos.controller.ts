import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('promos')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Get()
  @Roles('admin', 'manager')
  @Permissions('promos.read')
  getPromoCodes(@Query('page') page: string, @Query('pageSize') pageSize: string) {
    return this.promosService.getPromoCodes(+page || 1, +pageSize || 20);
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('promos.create')
  createPromo(@Body() createPromoCodeDto: CreatePromoCodeDto) {
    return this.promosService.createPromo(createPromoCodeDto);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('promos.update')
  updatePromo(@Param('id') id: string, @Body() updatePromoCodeDto: UpdatePromoCodeDto) {
    return this.promosService.updatePromo(id, updatePromoCodeDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @Permissions('promos.delete')
  deletePromo(@Param('id') id: string) {
    return this.promosService.deletePromo(id);
  }

  @Public() // Accessible safely to validate cart
  @Post('validate')
  validatePromo(@Body('code') code: string, @Body('orderTotal') orderTotal: number) {
    return this.promosService.validatePromo(code, orderTotal);
  }
}
