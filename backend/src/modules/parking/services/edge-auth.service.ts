import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EdgeAuthService {
  private readonly logger = new Logger(EdgeAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processHeartbeat(data: any, organizationId: string): Promise<void> {
    const deviceId = data.deviceId;

    await this.prisma.edgeDevice.updateMany({
      where: { id: deviceId, organizationId },
      data: { lastHeartbeatAt: new Date() },
    });

    this.logger.debug(`Heartbeat from device ${deviceId}`);
  }

  async getActiveSessions(deviceId: string, organizationId: string): Promise<any[]> {
    return this.prisma.parkingSession.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { entryDeviceId: deviceId },
          { exitDeviceId: deviceId },
        ],
      },
      select: {
        plateNumber: true,
        entryTime: true,
      },
    });
  }
}