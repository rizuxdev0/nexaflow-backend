import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorRequest } from './entities/vendor-request.entity';
import { VendorRequestsService } from './vendor-requests.service';
import { VendorRequestsController } from './vendor-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VendorRequest])],
  controllers: [VendorRequestsController],
  providers: [VendorRequestsService],
  exports: [VendorRequestsService],
})
export class VendorRequestsModule {}
