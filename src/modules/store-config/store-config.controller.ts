import { Controller, Get, Put, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { StoreConfigService } from './store-config.service';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('store-config')
@ApiBearerAuth()
@Controller('store-config')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class StoreConfigController {
  constructor(private readonly storeConfigService: StoreConfigService) {}

  @Public()
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  get() {
    return this.storeConfigService.get();
  }

  @Put()
  @Roles('admin', 'manager')
  @Permissions('store_config.update')
  update(@Body() updateStoreConfigDto: UpdateStoreConfigDto) {
    return this.storeConfigService.update(updateStoreConfigDto);
  }
}
