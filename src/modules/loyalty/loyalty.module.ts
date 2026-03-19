import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { CustomersModule } from '../customers/customers.module'; // To update customer points later

@Module({
  imports: [
    TypeOrmModule.forFeature([LoyaltyReward, LoyaltyTransaction]),
    CustomersModule,
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService]
})
export class LoyaltyModule {}
