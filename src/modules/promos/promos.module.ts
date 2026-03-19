import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';
import { PromoCode } from './entities/promo-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode])],
  controllers: [PromosController],
  providers: [PromosService],
  exports: [PromosService]
})
export class PromosModule {}
