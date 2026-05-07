import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDevices(organizationId: string, locationId?: string) {
    return this.prisma.edgeDevice.findMany({
      where: {
        organizationId,
        ...(locationId && { locationId }),
      },
      include: {
        location: true,
      },
    });
  }

  async getCameras(organizationId: string, locationId?: string) {
    return this.prisma.parkingCamera.findMany({
      where: {
        organizationId,
        ...(locationId && { locationId }),
      },
      include: {
        location: true,
      },
    });
  }

  async updateDeviceStatus(deviceId: string, status: any) {
    return this.prisma.edgeDevice.update({
      where: { id: deviceId },
      data: {
        lastHeartbeatAt: new Date(),
        isActive: status === 'online',
      },
    });
  }
}