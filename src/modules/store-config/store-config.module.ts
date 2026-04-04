import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreConfigController } from './store-config.controller';
import { StoreConfigService } from './store-config.service';
import { StoreConfig } from './entities/store-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StoreConfig])],
  controllers: [StoreConfigController],
  providers: [StoreConfigService],
  exports: [StoreConfigService]
})
export class StoreConfigModule {}
