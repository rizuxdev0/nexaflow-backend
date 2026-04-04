import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DeferredPaymentsService } from './deferred-payments.service';
import { CreateDeferredPaymentDto, RecordPaymentEntryDto, ExtendDueDateDto, OverdueActionDto } from './dto/deferred-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('deferred-payments')
@ApiBearerAuth()
@Controller('deferred-payments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DeferredPaymentsController {
  constructor(private readonly deferredPaymentsService: DeferredPaymentsService) {}

  @Get()
  @Roles('admin', 'manager')
  @Permissions('deferred_payments.read')
  getAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('status') status?: string
  ) {
    return this.deferredPaymentsService.getAll(+page || 1, +pageSize || 20, status);
  }

  @Get('customer/:customerId')
  @Roles('admin', 'manager')
  getByCustomer(@Param('customerId') customerId: string) {
    return this.deferredPaymentsService.getByCustomer(customerId);
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('deferred_payments.create')
  create(@Body() createDto: CreateDeferredPaymentDto) {
    return this.deferredPaymentsService.create(createDto);
  }

  @Post(':id/record')
  @Roles('admin', 'manager', 'cashier')
  @Permissions('deferred_payments.update')
  recordPayment(@Param('id') id: string, @Body() entryDto: RecordPaymentEntryDto) {
    return this.deferredPaymentsService.recordPayment(id, entryDto);
  }

  @Post('check-overdue')
  @Roles('admin', 'manager')
  processOverdue(@Body() actionDto: OverdueActionDto) {
    return this.deferredPaymentsService.processOverdue(actionDto);
  }

  @Patch(':id/extend')
  @Roles('admin', 'manager')
  @Permissions('deferred_payments.update')
  extend(@Param('id') id: string, @Body() extendDto: ExtendDueDateDto) {
    return this.deferredPaymentsService.extend(id, extendDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @Permissions('deferred_payments.delete')
  cancel(@Param('id') id: string) {
    return this.deferredPaymentsService.cancel(id);
  }
}
