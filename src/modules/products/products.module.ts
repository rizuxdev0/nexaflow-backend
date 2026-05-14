import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { User } from '../users/entities/user.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Branch } from '../branches/entities/branch.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { StoreConfigModule } from '../store-config/store-config.module';
import { CategoriesModule } from '../categories/categories.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { StockModule } from '../stock/stock.module';
import { VariantsService } from './variants.service';
import { ProductsExportService } from './products-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, User, Warehouse, Branch, SubscriptionPlan]),
    CategoriesModule,
    SuppliersModule,
    StockModule,
    StoreConfigModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, VariantsService, ProductsExportService],
  exports: [ProductsService, VariantsService, ProductsExportService],
})
export class ProductsModule {}
