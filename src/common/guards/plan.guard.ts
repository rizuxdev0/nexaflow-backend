import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StoreConfigService } from '../../modules/store-config/store-config.service';
import { PLAN_QUOTAS } from '../../modules/store-config/subscription-plans';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const CHECK_PLAN_KEY = 'check_plan';
export const CheckPlan = (feature: string) => SetMetadata(CHECK_PLAN_KEY, feature);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private storeConfigService: StoreConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>(CHECK_PLAN_KEY, context.getHandler());
    
    // If no feature is specified for this route, we don't enforce plan checks here
    if (!feature) {
      return true;
    }

    const config = await this.storeConfigService.get();
    const quotas = PLAN_QUOTAS[config.subscriptionPlan];

    // Check if subscription is expired
    if (config.subscriptionStatus === 'expired') {
        throw new ForbiddenException('Votre abonnement a expiré. Veuillez le renouveler pour accéder à cette fonctionnalité.');
    }

    // Feature specific checks
    switch (feature) {
      case 'pos':
        if (!quotas.hasPos) throw new ForbiddenException('Votre plan actuel ne permet pas d\'utiliser le POS.');
        break;
      case 'chat':
        if (!quotas.hasChat) throw new ForbiddenException('Votre plan actuel ne permet pas d\'utiliser le Chat Support.');
        break;
      case 'analytics':
        if (!quotas.hasAnalytics) throw new ForbiddenException('Votre plan actuel ne permet pas d\'accéder aux rapports avancés.');
        break;
      case 'warehouses':
        // This might need more logic in the specific service
        break;
    }

    return true;
  }
}
