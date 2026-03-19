import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto, UpdateReturnStatusDto } from './dto/return.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @Roles('admin', 'manager')
  @Permissions('returns.read')
  getAll(
    @Query('page') page: string, 
    @Query('pageSize') pageSize: string,
    @Query('status') status?: string
  ) {
    return this.returnsService.getAll(+page || 1, +pageSize || 20, status);
  }

  @Get('customer/:customerId')
  @Roles('admin', 'manager', 'customer')
  getByCustomer(@Param('customerId') customerId: string) {
    // A customer should ideally only read their own returns, but for now it's accessible by roles
    return this.returnsService.getByCustomer(customerId);
  }

  @Post()
  @Roles('admin', 'manager', 'customer')
  // No strict permission required if it's a customer creating their own return request
  create(@Body() createReturnDto: CreateReturnDto) {
    return this.returnsService.create(createReturnDto);
  }

  @Patch(':id/status')
  @Roles('admin', 'manager')
  @Permissions('returns.update')
  updateStatus(@Param('id') id: string, @Body() updateDto: UpdateReturnStatusDto) {
    return this.returnsService.updateStatus(id, updateDto);
  }
}
