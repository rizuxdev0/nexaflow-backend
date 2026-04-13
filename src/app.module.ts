import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

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
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AuthModule } from './modules/auth/auth.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersController } from './modules/users/users.controller';
import { UsersModule } from './modules/users/users.module';
import { RolesService } from './modules/roles/roles.service';
import { RolesController } from './modules/roles/roles.controller';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { StoreConfigModule } from './modules/store-config/store-config.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReturnPolicyModule } from './modules/return-policy/return-policy.module';
import { BannersModule } from './modules/banners/banners.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { PromosModule } from './modules/promos/promos.module';
import { PackagesModule } from './modules/packages/packages.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DeferredPaymentsModule } from './modules/deferred-payments/deferred-payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BranchesModule } from './modules/branches/branches.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StockModule } from './modules/stock/stock.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { InventoriesModule } from './modules/inventories/inventories.module';
import { SavedCartsModule } from './modules/saved-carts/saved-carts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { UploadModule } from './modules/upload/upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { VendorRequestsModule } from './modules/vendor-requests/vendor-requests.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { CustomPacksModule } from './modules/custom-packs/custom-packs.module';
import { ChatModule } from './modules/chat/chat.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CustomerEventsModule } from './modules/customer-events/customer-events.module';



// Common

@Module({
  imports: [
    // ============ CONFIGURATION GLOBALE ============
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        
        // Si REDIS_HOST n'est pas configuré, on utilise le cache en mémoire (évite les plantages)
        if (!redisHost || redisHost === 'none') {
          return { store: 'memory', ttl: 3600 };
        }

        try {
          return {
            store: await redisStore({
              socket: {
                host: redisHost,
                port: parseInt(configService.get('REDIS_PORT', '6379')),
              },
              ttl: parseInt(configService.get('REDIS_TTL', '3600')),
            }),
          };
        } catch (error) {
          console.error('Redis initialization failed, falling back to memory store.');
          return { store: 'memory', ttl: 3600 };
        }
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),

    // ============ MODULES DE L'APPLICATION ============
    DatabaseModule,

    // Phase 1 - Gestion des produits et des fournisseurs
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    CurrenciesModule,

    // Phase 2 - Gestion des ventes et des stocks
    RegistersModule,
    CashSessionsModule,
    InvoicesModule,
    OrdersModule,

    // Phase 3 - Gestion de la clientèle et du point de vente
    CustomersModule,
    ShopModule,

    // Phase 4 - Authentification & Gestion des utilisateurs
    AuthModule,
    UsersModule,
    PermissionsModule,
    RolesModule,

    // Phase 5 - Audit et rapports
    AuditModule,

    ExpensesModule,
    WebhooksModule,
    StoreConfigModule,
    DashboardModule,
    ReturnPolicyModule,

    BannersModule,
    LoyaltyModule,
    PromosModule,
    PackagesModule,
    ReturnsModule,
    ReviewsModule,
    DeferredPaymentsModule,
    BranchesModule,
    WarehousesModule,
    BatchesModule,
    StockModule,
    PurchaseOrdersModule,
    InventoriesModule,
    SavedCartsModule,
    ReportsModule,
    NotificationsModule,
    CashRegistersModule,
    TestimonialsModule,
    UploadModule,
    WishlistModule,
    VendorRequestsModule,
    DeliveriesModule,
    CustomPacksModule,
    ChatModule,
    VendorsModule,
    CustomerEventsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController, UsersController, RolesController],
  providers: [
    AppService,
    // ============ GLOBAL INTERCEPTORS ============
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Vérifie l'authentification
    },

    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // Vérifie les permissions
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor, // ← Ajouter l'intercepteur d'audit
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
