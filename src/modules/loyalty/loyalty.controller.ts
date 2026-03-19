import { Controller, Get, Post, Body, Put, Param, Delete, Patch, Query, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { EarnPointsDto, RedeemRewardDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.loyaltyService.getConfig();
  }

  @Public()
  @Get('rewards/active')
  getActiveRewards() {
    return this.loyaltyService.getActiveRewards();
  }

  @Get('rewards')
  @Roles('admin', 'manager')
  @Permissions('loyalty.read')
  getRewards(@Query('page') page: string, @Query('pageSize') pageSize: string) {
    return this.loyaltyService.getRewards(+page || 1, +pageSize || 20);
  }

  @Post('rewards')
  @Roles('admin', 'manager')
  @Permissions('loyalty.create')
  createReward(@Body() dto: CreateLoyaltyRewardDto) {
    return this.loyaltyService.createReward(dto);
  }

  @Put('rewards/:id')
  @Roles('admin', 'manager')
  @Permissions('loyalty.update')
  updateReward(@Param('id') id: string, @Body() dto: UpdateLoyaltyRewardDto) {
    return this.loyaltyService.updateReward(id, dto);
  }

  @Get('transactions')
  @Roles('admin', 'manager')
  @Permissions('loyalty.read')
  getTransactions(
    @Query('page') page: string, 
    @Query('pageSize') pageSize: string,
    @Query('customerId') customerId?: string
  ) {
    return this.loyaltyService.getTransactions(customerId, +page || 1, +pageSize || 20);
  }

  @Post('earn')
  // We can restrict to order service calling this or specific roles
  @Roles('admin', 'manager', 'cashier')
  @Permissions('loyalty.update')
  earnPoints(@Body() dto: EarnPointsDto) {
    return this.loyaltyService.earnPoints(dto);
  }

  @Post('redeem')
  @Roles('admin', 'manager', 'cashier', 'customer')
  // 'customer' could redeem their own, but since we rely on customerId it's fine for now 
  // if we have proper checks
  redeemReward(@Body() dto: RedeemRewardDto) {
    return this.loyaltyService.redeemReward(dto);
  }
}
