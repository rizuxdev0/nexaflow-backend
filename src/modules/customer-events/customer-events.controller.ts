import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { CustomerEventsService } from './customer-events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('customer-events')
export class CustomerEventsController {
  constructor(private readonly eventsService: CustomerEventsService) {}

  @Post()
  async log(@Body() data: any, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    return await this.eventsService.log({
      ...data,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('event') event?: string,
    @Query('customerId') customerId?: string,
  ) {
    return await this.eventsService.findAll(page, pageSize, { event, customerId });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return await this.eventsService.getStats();
  }
}
