import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SavedCartsService } from './saved-carts.service';
import { CreateSavedCartDto } from './dto/saved-cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

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

  @Get('customer/:customerId')
  @Public()
  @ApiOperation({ summary: 'Get saved carts by customer ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'List of saved carts for customer' })
  findByCustomer(@Param('customerId') customerId: string) {
    return this.cartsService.findByCustomer(customerId);
  }

  @Delete('customer/:customerId')
  @Public()
  @ApiOperation({ summary: 'Delete all saved carts for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  removeByCustomer(@Param('customerId') customerId: string) {
    return this.cartsService.removeByCustomer(customerId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.cartsService.findOne(id);
  }

  @Post()
  @Public()
  create(@Body() dto: CreateSavedCartDto) {
    return this.cartsService.create(dto);
  }

  @Put(':id')
  @Public()
  update(@Param('id') id: string, @Body() dto: Partial<CreateSavedCartDto>) {
    return this.cartsService.update(id, dto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.cartsService.remove(id);
  }

  @Post('cleanup')
  @Public()
  cleanup() {
    return this.cartsService.cleanup();
  }
}
