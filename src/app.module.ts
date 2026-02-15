import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { DatabaseModule } from './database/database.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { RegistersModule } from './modules/registers/registers.module';
import { CashSessionsModule } from './modules/cash-sessions/cash-sessions.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ShopModule } from './modules/shop/shop.module';

// Common

@Module({
  imports: [
    // ============ CONFIGURATION GLOBALE ============
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
    }),

    // ============ MODULES DE L'APPLICATION ============
    DatabaseModule,

    // Phase 1
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    CurrenciesModule,

    // Phase 2
    RegistersModule,
    CashSessionsModule,
    InvoicesModule,

    // Phase 3
    CustomersModule,
    ShopModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ============ GLOBAL INTERCEPTORS ============
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // ============ GLOBAL FILTERS ============
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // ============ GLOBAL PIPES ============
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
