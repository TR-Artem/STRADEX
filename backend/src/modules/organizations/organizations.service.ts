import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganization(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        locations: true,
        _count: {
          select: {
            devices: true,
            users: true,
          },
        },
      },
    });
  }

  async getLocations(organizationId: string) {
    return this.prisma.parkingLocation.findMany({
      where: { organizationId, isActive: true },
      include: {
        cameras: true,
        devices: true,
        _count: {
          select: { sessions: { where: { status: 'ACTIVE' } } },
        },
      },
    });
  }

  async createLocation(data: any) {
    return this.prisma.parkingLocation.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone || 'Europe/Moscow',
        totalSpots: data.totalSpots,
        hourlyRate: data.hourlyRate,
        firstFreeMinutes: data.firstFreeMinutes || 15,
        maxDailyRate: data.maxDailyRate,
      },
    });
  }

  async getOrganizationStats(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeSessions, todaySessions, locations] = await Promise.all([
      this.prisma.parkingSession.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prisma.parkingSession.findMany({
        where: {
          organizationId,
          createdAt: { gte: today },
        },
      }),
      this.prisma.parkingLocation.findMany({
        where: { organizationId, isActive: true },
        select: { totalSpots: true },
      }),
    ]);

    const completedToday = todaySessions.filter(s => s.status === 'COMPLETED');
    const todayRevenue = completedToday.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalSpots = locations.reduce((sum, l) => sum + l.totalSpots, 0);

    return {
      activeSessions,
      todayRevenue,
      todayEntries: todaySessions.length,
      todayExits: completedToday.length,
      totalLocations: locations.length,
      totalSpots,
      occupancyRate: totalSpots > 0 ? Math.round((activeSessions / totalSpots) * 100) : 0,
    };
  }
}