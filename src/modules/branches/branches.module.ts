import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { Branch } from './entities/branch.entity';

import { User } from '../users/entities/user.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { StoreConfigModule } from '../store-config/store-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, User, Warehouse, Product, SubscriptionPlan]),
    StoreConfigModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
