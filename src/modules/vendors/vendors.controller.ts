import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorStatus } from './entities/vendor.entity';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon profil vendeur' })
  findMe(@Request() req: any) {
    return this.vendorsService.findOneByUser(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des vendeurs' })
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.vendorsService.findAll(page, pageSize, status, search);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de la marketplace' })
  getStats() {
    return this.vendorsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un vendeur' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Créer un vendeur' })
  create(@Body() data: any) {
    return this.vendorsService.create(data);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Modifier un vendeur' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.vendorsService.update(id, data);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Changer le statut d\'un vendeur' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: VendorStatus,
    @Body('reason') reason?: string,
  ) {
    return this.vendorsService.updateStatus(id, status, reason);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Supprimer un vendeur' })
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }
}
