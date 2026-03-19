import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Public()
  @Get()
  getBundles(
    @Query('page') page: string, 
    @Query('pageSize') pageSize: string,
    @Query('includeInactive') includeInactive: string
  ) {
    return this.packagesService.getBundles(+page || 1, +pageSize || 20, includeInactive === 'true');
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('packages.create')
  createBundle(@Body() createPackageDto: CreatePackageDto) {
    return this.packagesService.createBundle(createPackageDto);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('packages.update')
  updateBundle(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packagesService.updateBundle(id, updatePackageDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @Permissions('packages.delete')
  deleteBundle(@Param('id') id: string) {
    return this.packagesService.deleteBundle(id);
  }
}
