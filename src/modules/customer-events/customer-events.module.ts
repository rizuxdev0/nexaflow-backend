import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEvent } from './entities/customer-event.entity';
import { CustomerEventsService } from './customer-events.service';
import { CustomerEventsController } from './customer-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerEvent])],
  providers: [CustomerEventsService],
  controllers: [CustomerEventsController],
  exports: [CustomerEventsService],
})
export class CustomerEventsModule {}
