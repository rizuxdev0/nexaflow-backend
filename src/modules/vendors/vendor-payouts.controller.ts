import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayoutsService } from './payouts.service';
import { PayoutStatus } from './entities/payout.entity';

@ApiTags('vendor-payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendor-payouts')
export class VendorPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des paiements vendeurs' })
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
  ) {
    if (vendorId) {
      return this.payoutsService.findByVendor(vendorId);
    }
    return this.payoutsService.findAll(Number(page), Number(pageSize), status);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  create(@Body() data: any) {
    return this.payoutsService.requestPayout(data.vendorId, data.amount, data.method);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Changer le statut d\'un paiement' })
  updateStatus(
    @Param('id') id: string, 
    @Body('status') status: PayoutStatus,
    @Body('reference') reference?: string,
    @Body('notes') notes?: string,
  ) {
    return this.payoutsService.processPayout(id, status, reference, notes);
  }
}
