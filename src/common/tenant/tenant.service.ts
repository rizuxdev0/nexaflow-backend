import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { tenantLocalStorage } from './tenant.context';

@Injectable()
export class TenantService {
  getVendorId(): string | null {
    const context = tenantLocalStorage.getStore();
    return context?.vendorId || null;
  }

  getVendorIdOrThrow(): string {
    const vendorId = this.getVendorId();
    if (!vendorId) {
      throw new Error('Tenant context missing: vendorId is required for this operation.');
    }
    return vendorId;
  }

  /**
   * Wraps a TypeORM repository with a proxy that automatically injects 
   * the vendorId into all read queries (find, findOne, count, etc.).
   * This ensures SQL-level isolation at the source.
   */
  tenantRepo<T>(repository: Repository<T>): Repository<T> {
    const vendorId = this.getVendorId();
    
    // If no vendor context (e.g. SuperAdmin or Public access), 
    // we don't apply the automatic filter.
    if (!vendorId) return repository;

    return new Proxy(repository, {
      get: (target, prop) => {
        const originalMethod = target[prop];
        if (typeof originalMethod !== 'function') return originalMethod;

        // List of methods that support 'where' options
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
            let options = args[0] || {};

            // Handle TypeORM 0.3 style (where options are often the first arg)
            if (typeof options === 'object') {
              if (!options.where) options.where = {};
              
              // Handle array of conditions (OR logic)
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

        // Methods that don't need wrapping or aren't query-based
        return originalMethod.bind(target);
      },
    }) as Repository<T>;
  }
}
