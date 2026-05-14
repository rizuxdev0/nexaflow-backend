import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantLocalStorage } from '../tenant/tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // On extrait le vendorId de l'utilisateur connecté ou du header X-Vendor-Id pour les accès publics
    const vendorId = user?.vendorId || request.headers['x-vendor-id'] || request.query['vendorId'] || null;

    return new Observable((observer) => {
      tenantLocalStorage.run({ vendorId }, () => {
        next.handle().subscribe({
          next: (res) => observer.next(res),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
