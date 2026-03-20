import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SavedCartsService } from './saved-carts.service';
import { CreateSavedCartDto } from './dto/saved-cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('saved-carts')
@ApiBearerAuth()
@Controller('saved-carts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SavedCartsController {
  constructor(private readonly cartsService: SavedCartsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.cartsService.findAll(query);
  }

  @Get(':id')
  @Public() // Allow customer to see their cart link without login (if link shared)
  findOne(@Param('id') id: string) {
    return this.cartsService.findOne(id);
  }

  @Post()
  @Public() // Allow anyone to save a cart
  create(@Body() dto: CreateSavedCartDto) {
    return this.cartsService.create(dto);
  }

  @Put(':id')
  @Public() // Updates allowed if the client has the ID
  update(@Param('id') id: string, @Body() dto: Partial<CreateSavedCartDto>) {
    return this.cartsService.update(id, dto);
  }

  @Delete(':id')
  @Public() // Deletion allowed via ID (e.g. after successful order)
  remove(@Param('id') id: string) {
    return this.cartsService.remove(id);
  }

  @Post('cleanup')
  @Public() // Can be called by CRON
  cleanup() {
    return this.cartsService.cleanup();
  }
}
