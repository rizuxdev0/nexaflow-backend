import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VendorStatus } from './entities/vendor.entity';

@ApiTags('vendor-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendor-requests')
export class VendorRequestsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Liste toutes les demandes vendeur' })
  findAll() {
    return this.vendorsService.findAll(1, 100, VendorStatus.PENDING);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Liste mes demandes vendeur' })
  findMyRequests(@Request() req: any) {
    return this.vendorsService.findByUser(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Soumettre une demande pour devenir vendeur' })
  create(@Request() req: any, @Body() data: any) {
    return this.vendorsService.create({
      ...data,
      userId: req.user.id,
      status: VendorStatus.PENDING,
    });
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Approuver ou rejeter une demande vendeur' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: VendorStatus,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.vendorsService.updateStatus(id, status, adminNotes);
  }
}
