import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Product } from '../products/entities/product.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Branch } from '../branches/entities/branch.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { StoreConfigModule } from '../store-config/store-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, Product, Warehouse, Branch, SubscriptionPlan]),
    StoreConfigModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
