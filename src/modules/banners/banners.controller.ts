import { Controller, Get, Post, Body, Put, Param, Delete, Patch, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('banners')
@ApiBearerAuth()
@Controller('banners')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @Roles('admin', 'manager')
  @Permissions('banners.create')
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannersService.create(createBannerDto);
  }

  @Get()
  @Roles('admin', 'manager')
  @Permissions('banners.read')
  findAll() {
    return this.bannersService.findAll();
  }

  @Public()
  @Get('active')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  getActive(@Query('position') position?: string) {
    return this.bannersService.getActive(position);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @Permissions('banners.read')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('banners.update')
  update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
    return this.bannersService.update(id, updateBannerDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @Permissions('banners.delete')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }

  @Patch(':id/toggle')
  @Roles('admin', 'manager')
  @Permissions('banners.update')
  toggleActive(@Param('id') id: string) {
    return this.bannersService.toggleActive(id);
  }
}
