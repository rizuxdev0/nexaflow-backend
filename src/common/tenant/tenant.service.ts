import { Injectable } from '@nestjs/common';
import { Repository, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { tenantLocalStorage } from './tenant.context';

@Injectable()
export class TenantService {
  /**
   * Retrieves the current vendorId from the request context.
   */
  getVendorId(): string | null {
    const context = tenantLocalStorage.getStore();
    return context?.vendorId || null;
  }

  /**
   * Retrieves the vendorId or throws an error if not found.
   */
  getVendorIdOrThrow(): string {
    const vendorId = this.getVendorId();
    if (!vendorId) {
      throw new Error('Tenant context missing: vendorId is required for this operation.');
    }
    return vendorId;
  }

  /**
   * Wraps a TypeORM repository with a proxy that automatically injects 
   * the vendorId into all read queries.
   */
  tenantRepo<T extends ObjectLiteral>(repository: Repository<T>): Repository<T> {
    const self = this;
    return new Proxy(repository, {
      get: (target, prop) => {
        const originalMethod = target[prop];
        if (typeof originalMethod !== 'function') return originalMethod;

        const vendorId = self.getVendorId();

        // Methods that support 'where' options
        const queryMethods = [
          'find', 
          'findOne', 
          'findOneBy', 
          'count', 
          'findAndCount',
          'average',
          'sum',
          'minimum',
          'maximum'
        ];

        if (queryMethods.includes(prop as string)) {
          return (...args: any[]) => {
            if (!vendorId) return originalMethod.apply(target, args);

            let options = args[0] || {};
            if (typeof options === 'object') {
              if (!options.where) options.where = {};
              
              if (Array.isArray(options.where)) {
                options.where = options.where.map((condition: any) => ({
                  ...condition,
                  vendorId,
                }));
              } else {
                options.where = {
                  ...options.where,
                  vendorId,
                };
              }
              args[0] = options;
            }
            return originalMethod.apply(target, args);
          };
        }

        // Robust QueryBuilder wrapping
        if (prop === 'createQueryBuilder') {
          return (...args: any[]) => {
            const builder = originalMethod.apply(target, args) as SelectQueryBuilder<T>;
            if (!vendorId) return builder;

            const alias = args[0] || builder.alias;
            
            // We wrap the execution methods to ensure vendorId is added AT THE END,
            // avoiding being overwritten by previous .where() calls.
            const executionMethods = [
              'getOne', 'getMany', 'getCount', 'getRawOne', 'getRawMany', 'getManyAndCount'
            ];

            return new Proxy(builder, {
              get: (bTarget, bProp) => {
                const bMethod = bTarget[bProp];
                if (typeof bMethod !== 'function') return bMethod;

                if (executionMethods.includes(bProp as string)) {
                  return (...bArgs: any[]) => {
                    // Inject vendorId just before execution
                    bTarget.andWhere(`${alias}.vendorId = :tenantVendorId`, { tenantVendorId: vendorId });
                    return bMethod.apply(bTarget, bArgs);
                  };
                }
                return bMethod.bind(bTarget);
              }
            });
          };
        }

        return originalMethod.bind(target);
      },
    }) as Repository<T>;
  }
}
