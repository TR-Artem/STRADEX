import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HmacAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // In production, validate HMAC signature
    // For now, extract organization from headers or use default
    const deviceId = request.headers['x-device-id'];
    
    if (deviceId) {
      const device = await this.prisma.edgeDevice.findFirst({
        where: { id: deviceId, isActive: true },
      });

      if (device) {
        request.hmac = {
          device: {
            id: device.id,
            locationId: device.locationId,
            organizationId: device.organizationId,
          },
          organizationId: device.organizationId,
        };
        return true;
      }
    }

    // Allow without HMAC for demo purposes
    request.hmac = {
      organizationId: 'demo-org',
    };
    return true;
  }
}