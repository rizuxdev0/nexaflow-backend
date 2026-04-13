import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { CashSession } from '../cash-sessions/entities/cash-session.entity';
import { AuditModule } from '../audit/audit.module';
import { StockModule } from '../stock/stock.module';
import { ProductBundle } from '../packages/entities/package.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CustomersModule } from '../customers/customers.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      ProductVariant,
      CashSession,
      ProductBundle,
      Warehouse,
    ]),
    AuditModule,
    StockModule,
    LoyaltyModule,
    CustomersModule,
    VendorsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
