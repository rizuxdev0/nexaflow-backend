import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomPacksController } from './custom-packs.controller';
import { CustomPacksService } from './custom-packs.service';
import { CustomPackConfig } from './entities/custom-pack-config.entity';
import { CustomPackRequest } from './entities/custom-pack-request.entity';
import { User } from '../users/entities/user.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomPackConfig, CustomPackRequest, User]),
    ProductsModule,
  ],
  controllers: [CustomPacksController],
  providers: [CustomPacksService],
  exports: [CustomPacksService],
})
export class CustomPacksModule {}
