import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PLAN_QUOTAS } from '../../modules/store-config/subscription-plans';
import { StoreConfigService } from '../../modules/store-config/store-config.service';
import { Product } from '../../modules/products/entities/product.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Warehouse } from '../../modules/warehouses/entities/warehouse.entity';
import { Branch } from '../../modules/branches/entities/branch.entity';
import { SubscriptionPlan as PlanEntity } from '../../modules/subscriptions/entities/subscription-plan.entity';
import { TenantService } from '../tenant/tenant.service';

export const QUOTA_RESOURCE_KEY = 'quota_resource';

export type QuotaResource =
  | 'products'
  | 'users'
  | 'warehouses'
  | 'branches';

export const CheckQuota = (resource: QuotaResource) =>
  SetMetadata(QUOTA_RESOURCE_KEY, resource);

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly storeConfigService: StoreConfigService,
    private readonly tenantService: TenantService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(PlanEntity)
    private readonly planRepo: Repository<PlanEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<QuotaResource>(
      QUOTA_RESOURCE_KEY,
      context.getHandler(),
    );

    if (!resource) return true;

    const request = context.switchToHttp().getRequest();
    const vendorId = request.user?.vendorId;

    // 1. Get filtered repositories automatically
    const products = this.tenantService.tenantRepo(this.productRepo);
    const users = this.tenantService.tenantRepo(this.userRepo);
    const warehouses = this.tenantService.tenantRepo(this.warehouseRepo);
    const branches = this.tenantService.tenantRepo(this.branchRepo);

    // 2. Fetch store config
    const config = await this.storeConfigService.get(vendorId);
    
    // 3. Resolve quotas (DB -> Default)
    let quotas = PLAN_QUOTAS[config.subscriptionPlan] as any;
    try {
      const dbPlan = await this.planRepo.findOne({ 
        where: { code: config.subscriptionPlan, isActive: true } 
      });
      if (dbPlan) {
        quotas = {
          ...quotas,
          maxProducts: dbPlan.maxProducts,
          maxUsers: dbPlan.maxUsers,
          maxWarehouses: dbPlan.maxWarehouses,
          maxOrdersPerMonth: dbPlan.maxOrdersPerMonth,
        };
      }
    } catch (e) {}

    // 4. Check status
    if (config.subscriptionStatus === 'expired') {
      throw new ForbiddenException('Votre abonnement a expiré. Veuillez le renouveler.');
    }

    // 5. Enforce quotas using filtered repositories (no need for manual 'where vendorId')
    switch (resource) {
      case 'products': {
        if (quotas.maxProducts === -1 || quotas.maxProducts === Infinity) break;
        const count = await products.count();
        if (count >= quotas.maxProducts) {
          throw new ForbiddenException(`Quota de produits atteint (${quotas.maxProducts}). Mettez à niveau votre plan.`);
        }
        break;
      }
      case 'users': {
        if (quotas.maxUsers === -1 || quotas.maxUsers === Infinity) break;
        const count = await users.count();
        if (count >= quotas.maxUsers) {
          throw new ForbiddenException(`Quota d'utilisateurs atteint (${quotas.maxUsers}). Mettez à niveau votre plan.`);
        }
        break;
      }
      case 'warehouses': {
        if (quotas.maxWarehouses === -1 || quotas.maxWarehouses === Infinity) break;
        const count = await warehouses.count();
        if (count >= quotas.maxWarehouses) {
          throw new ForbiddenException(`Quota d'entrepôts atteint (${quotas.maxWarehouses}). Mettez à niveau votre plan.`);
        }
        break;
      }
      case 'branches': {
        if (quotas.maxWarehouses === -1 || quotas.maxWarehouses === Infinity) break;
        const count = await branches.count();
        if (count >= quotas.maxWarehouses) {
          throw new ForbiddenException(`Quota de succursales atteint (${quotas.maxWarehouses}). Mettez à niveau votre plan.`);
        }
        break;
      }
    }

    return true;
  }
}
