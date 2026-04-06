import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorRequestsService } from './vendor-requests.service';
import { VendorRequestsController } from './vendor-requests.controller';
import { VendorRequest } from './entities/vendor-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VendorRequest]),
    NotificationsModule,
  ],
  controllers: [VendorRequestsController],
  providers: [VendorRequestsService],
  exports: [VendorRequestsService],
})
export class VendorRequestsModule {}
