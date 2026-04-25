import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CategoriesModule } from '../categories/categories.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { StockModule } from '../stock/stock.module';
import { VariantsService } from './variants.service';
import { ProductsExportService } from './products-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant]),
    CategoriesModule, // Pour utiliser CategoriesService
    SuppliersModule, // Pour utiliser SuppliersService
    StockModule, // Pour utiliser StockService
  ],
  controllers: [ProductsController],
  providers: [ProductsService, VariantsService, ProductsExportService],
  exports: [ProductsService, VariantsService, ProductsExportService],
})
export class ProductsModule {}
