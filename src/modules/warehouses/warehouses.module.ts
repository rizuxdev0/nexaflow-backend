import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './entities/warehouse.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { StoreConfigModule } from '../store-config/store-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, Branch, User, Product, SubscriptionPlan]),
    StoreConfigModule,
  ],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
