// import { Module, forwardRef } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ShopService } from './shop.service';
// import { ShopController } from './shop.controller';
// import { Product } from '../products/entities/product.entity';
// import { Category } from '../categories/entities/category.entity';
// import { Order } from '../orders/entities/order.entity';
// import { OrderItem } from '../orders/entities/order-item.entity';
// import { Customer } from '../customers/entities/customer.entity';
// import { CustomersModule } from '../customers/customers.module';
// import { ProductsModule } from '../products/products.module';
// import { InvoicesModule } from '../invoices/invoices.module';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([Product, Category, Order, OrderItem, Customer]),
//     CustomersModule,
//     ProductsModule,
//     forwardRef(() => InvoicesModule),
//   ],
//   controllers: [ShopController],
//   providers: [ShopService],
//   exports: [ShopService],
// })
// export class ShopModule {}
// Dans shop.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { InvoicesModule } from '../invoices/invoices.module'; // ← Ajouter

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Order, OrderItem, Customer]),
    CustomersModule,
    ProductsModule,
    InvoicesModule, // ← Ajouter
  ],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
