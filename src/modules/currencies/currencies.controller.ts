import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('currencies')
@ApiBearerAuth()
@Controller('currencies')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CurrenciesController {
  constructor(private readonly currencyService: CurrenciesService) {}

  @Public() // Allow customer to see available currencies
  @Get()
  findAll() {
    return this.currencyService.findAll();
  }

  @Get(':id')
  @Permissions('settings.read')
  findOne(@Param('id') id: string) {
    return this.currencyService.findOne(id);
  }

  @Post()
  @Permissions('settings.update')
  create(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.create(dto);
  }

  @Put(':id')
  @Permissions('settings.update')
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencyService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings.delete')
  remove(@Param('id') id: string) {
    return this.currencyService.remove(id);
  }

  @Get('convert') // /api/currencies/convert?amount=100&from=USD&to=EUR
  @Public()
  convert(@Query('amount') amount: number, @Query('from') from: string, @Query('to') to: string) {
    return this.currencyService.convert(amount, from, to);
  }
}
