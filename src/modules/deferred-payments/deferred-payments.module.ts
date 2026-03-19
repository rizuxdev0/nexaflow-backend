import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeferredPaymentsController } from './deferred-payments.controller';
import { DeferredPaymentsService } from './deferred-payments.service';
import { DeferredPayment } from './entities/deferred-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeferredPayment])],
  controllers: [DeferredPaymentsController],
  providers: [DeferredPaymentsService],
  exports: [DeferredPaymentsService]
})
export class DeferredPaymentsModule {}
