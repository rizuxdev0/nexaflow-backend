import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  vendorId: string | null;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();
