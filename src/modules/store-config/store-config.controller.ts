import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
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
