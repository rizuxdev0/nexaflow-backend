import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnPolicy } from './entities/return-policy.entity';
import { ReturnPolicyService } from './return-policy.service';
import { ReturnPolicyController } from './return-policy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReturnPolicy])],
  controllers: [ReturnPolicyController],
  providers: [ReturnPolicyService],
  exports: [ReturnPolicyService],
})
export class ReturnPolicyModule {}
