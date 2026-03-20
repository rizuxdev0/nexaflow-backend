import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('packages')
@ApiBearerAuth()
@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @Permissions('promos.read')
  findAll(@Query() query: any) {
    return this.packagesService.findAll(query);
  }

  @Get(':id')
  @Permissions('promos.read')
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Get('slug/:slug')
  @Public() // Allow public view of package details
  findBySlug(@Param('slug') slug: string) {
    return this.packagesService.findBySlug(slug);
  }

  @Post()
  @Permissions('promos.update')
  create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  @Put(':id')
  @Permissions('promos.update')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePackageDto>) {
    return this.packagesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('promos.delete')
  remove(@Param('id') id: string) {
    return this.packagesService.remove(id);
  }
}
