import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expenseService: ExpensesService) {}

  @Get('categories')
  @Permissions('expenses.read')
  findAllCategories() {
    return this.expenseService.findAllCategories();
  }

  @Post('categories')
  @Permissions('expenses.update')
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expenseService.createCategory(dto);
  }

  @Get()
  @Permissions('expenses.read')
  findAll(@Query() query: any) {
    return this.expenseService.findAll(query);
  }

  @Get('summary')
  @Permissions('expenses.read')
  getSummary(@Query('branchId') branchId: string, @Query('startDate') start: string, @Query('endDate') end: string) {
    return this.expenseService.getSummary(branchId, start, end);
  }

  @Get(':id')
  @Permissions('expenses.read')
  findOne(@Param('id') id: string) {
    return this.expenseService.findOne(id);
  }

  @Post()
  @Permissions('expenses.update')
  create(@Body() dto: CreateExpenseDto, @CurrentUser('id') userId: string) {
    return this.expenseService.create(dto, userId);
  }

  @Put(':id')
  @Permissions('expenses.update')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenseService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('expenses.delete')
  remove(@Param('id') id: string) {
    return this.expenseService.remove(id);
  }
}
