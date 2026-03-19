import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { Return } from './entities/return.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Return])],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService]
})
export class ReturnsModule {}
