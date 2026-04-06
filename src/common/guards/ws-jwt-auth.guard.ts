import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        throw new WsException('Authentification requise');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET') || 'secretKey',
      });

      (client as any).user = payload;
      
      return true;
    } catch (err) {
      throw new WsException('Session invalide');
    }
  }
}
