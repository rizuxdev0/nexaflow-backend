import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { AuthModule } from './modules/auth/auth.module';
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

    // Phase 1 - Gestion des produits et des fournisseurs
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    CurrenciesModule,

    // Phase 2 - Gestion des ventes et des stocks
    RegistersModule,
    CashSessionsModule,
    InvoicesModule,

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
  ],
  controllers: [AppController, UsersController, RolesController],
  providers: [
    AppService,
    // ============ GLOBAL INTERCEPTORS ============
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Vérifie l'authentification
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Vérifie les rôles
    },
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
