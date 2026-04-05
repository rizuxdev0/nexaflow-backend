import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { CustomPacksService } from './custom-packs.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('custom-packs')
export class CustomPacksController {
  constructor(private readonly service: CustomPacksService) {}

  // --- Configuration ---
  @Get('config')
  @Public() // Accessible for customers to see limits/discounts
  async getConfig() {
    return this.service.getConfig();
  }

  @Put('config')
  // Admin role check should go here if you have it
  async updateConfig(@Body() data: any) {
    return this.service.updateConfig('', data);
  }

  // --- Requests ---
  @Get('requests')
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.findAll(pagination, status, customerId);
  }

  @Get('requests/pending-count')
  async getPendingCount() {
    return this.service.getPendingCount();
  }

  @Get('requests/:id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('requests')
  @Public() // Customers can create requests
  async create(@Body() data: any) {
    return this.service.create(data);
  }

  @Post('requests/:id/approve')
  async approve(
    @Param('id') id: string,
    @Body('adminNote') adminNote: string,
    @Body('adjustedDiscount') adjustedDiscount: any,
  ) {
    return this.service.approve(id, adminNote, adjustedDiscount);
  }

  @Post('requests/:id/reject')
  async reject(@Param('id') id: string, @Body('adminNote') adminNote: string) {
    return this.service.reject(id, adminNote);
  }
}
