import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CategoriesModule } from '../categories/categories.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant]),
    CategoriesModule, // Pour utiliser CategoriesService
    SuppliersModule, // Pour utiliser SuppliersService
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
