import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { VendorProductsController } from './vendor-products.controller';
import { CommissionRulesController } from './commission-rules.controller';
import { VendorOrdersController } from './vendor-orders.controller';
import { VendorPayoutsController } from './vendor-payouts.controller';
import { Vendor } from './entities/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor])],
  controllers: [
    VendorsController,
    VendorProductsController,
    CommissionRulesController,
    VendorOrdersController,
    VendorPayoutsController,
  ],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
