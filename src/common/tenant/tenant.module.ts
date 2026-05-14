import { Global, Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantSubscriber } from './tenant.subscriber';

@Global()
@Module({
  providers: [TenantService, TenantSubscriber],
  exports: [TenantService],
})
export class TenantModule {}
