import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { CustomerEventsService } from './customer-events.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { Request } from 'express';

@Public()
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
  @Roles('admin', 'manager')
  @Permissions('audit.read')
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('event') event?: string,
    @Query('customerId') customerId?: string,
  ) {
    return await this.eventsService.findAll(page, pageSize, { event, customerId });
  }

  @Get('stats')
  @Roles('admin', 'manager')
  @Permissions('audit.read')
  async getStats() {
    return await this.eventsService.getStats();
  }
}
