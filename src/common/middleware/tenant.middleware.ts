import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage } from '../tenant/tenant.context';

/**
 * Middleware that establishes the tenant context using AsyncLocalStorage.
 * This runs BEFORE guards and interceptors, ensuring the vendorId 
 * is available throughout the entire request lifecycle.
 * 
 * We decode the JWT payload (base64) without verification here — 
 * the JwtAuthGuard handles actual token verification later.
 * If the token is invalid, vendorId stays null and the guard rejects the request.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let vendorId: string | null = null;

    // 1. Try to extract vendorId from JWT token (decode only, no verification)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        vendorId = payload.vendorId || null;
      } catch (e) {
        // Token malformed — vendorId stays null, guard will handle rejection
      }
    }

    // 2. Fallback to header or query param (for public/ecommerce routes)
    if (!vendorId) {
      vendorId = (req.headers['x-vendor-id'] as string) || (req.query['vendorId'] as string) || null;
    }

    // Run the entire request inside the tenant AsyncLocalStorage context
    tenantLocalStorage.run({ vendorId }, () => {
      next();
    });
  }
}
