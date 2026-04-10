import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorRequestsService } from './vendor-requests.service';
import { VendorRequestsController } from './vendor-requests.controller';
import { VendorRequest } from './entities/vendor-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { VendorsModule } from '../vendors/vendors.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VendorRequest]),
    NotificationsModule,
    VendorsModule,
    UsersModule,
    RolesModule,
  ],
  controllers: [VendorRequestsController],
  providers: [VendorRequestsService],
  exports: [VendorRequestsService],
})
export class VendorRequestsModule {}
