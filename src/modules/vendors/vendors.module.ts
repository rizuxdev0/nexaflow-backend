import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { VendorProductsController } from './vendor-products.controller';
import { CommissionRulesController } from './commission-rules.controller';
import { VendorOrdersController } from './vendor-orders.controller';
import { VendorPayoutsController } from './vendor-payouts.controller';
import { VendorRequestsController } from './vendor-requests.controller';
import { Vendor } from './entities/vendor.entity';
import { CommissionRule } from './entities/commission-rule.entity';
import { Payout } from './entities/payout.entity';
import { CommissionService } from './commission.service';
import { PayoutsService } from './payouts.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, CommissionRule, Payout]),
    ProductsModule,
  ],
  controllers: [
    VendorsController,
    VendorProductsController,
    CommissionRulesController,
    VendorOrdersController,
    VendorPayoutsController,
    VendorRequestsController,
  ],
  providers: [VendorsService, CommissionService, PayoutsService],
  exports: [VendorsService, CommissionService, PayoutsService],
})
export class VendorsModule {}
