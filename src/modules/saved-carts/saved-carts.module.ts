import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedCartsController } from './saved-carts.controller';
import { SavedCartsService } from './saved-carts.service';
import { SavedCart } from './entities/saved-cart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedCart])],
  controllers: [SavedCartsController],
  providers: [SavedCartsService],
  exports: [SavedCartsService],
})
export class SavedCartsModule {}
