import { Controller, Get, Post, Body, Query, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStatistics(@Query('organizationId') organizationId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = organizationId ? { organizationId } : {};

    const [activeSessions, todaySessions, completedToday, locations] = await Promise.all([
      this.prisma.parkingSession.count({
        where: { ...where, status: 'ACTIVE' },
      }),
      this.prisma.parkingSession.findMany({
        where: { ...where, createdAt: { gte: today } },
      }),
      this.prisma.parkingSession.findMany({
        where: { ...where, status: 'COMPLETED', exitTime: { gte: today } },
      }),
      this.prisma.parkingLocation.findMany({
        where: { isActive: true },
      }),
    ]);

    const todayRevenue = completedToday.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalDuration = completedToday.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = completedToday.length > 0 
      ? Math.round(totalDuration / completedToday.length) 
      : 0;

    const totalSpots = locations.reduce((sum, l) => sum + l.totalSpots, 0);
    const occupancyRate = totalSpots > 0 
      ? Math.round((activeSessions / totalSpots) * 100) 
      : 0;

    return {
      activeSessions,
      todayRevenue,
      todayEntries: todaySessions.length,
      todayExits: completedToday.length,
      avgDuration,
      occupancyRate,
    };
  }

  @Get('parking/locations')
  @ApiOperation({ summary: 'Get all locations' })
  async getLocations(@Query('organizationId') organizationId?: string) {
    const where: any = { isActive: true };
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.parkingLocation.findMany({ where });
  }

  @Post('parking/locations')
  @ApiOperation({ summary: 'Create parking location' })
  async createLocation(@Body() data: {
    organizationId: string;
    name: string;
    address: string;
    totalSpots?: number;
    hourlyRate?: number;
    firstFreeMinutes?: number;
    maxDailyRate?: number;
  }) {
    return this.prisma.parkingLocation.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        address: data.address,
        totalSpots: data.totalSpots || 100,
        hourlyRate: data.hourlyRate || 20000,
        firstFreeMinutes: data.firstFreeMinutes || 15,
        maxDailyRate: data.maxDailyRate || 50000,
        isActive: true,
      },
    });
  }

  @Get('parking/sessions/active')
  @ApiOperation({ summary: 'Get active parking sessions' })
  async getActiveSessions(@Query('locationId') locationId?: string) {
    const where: any = { status: 'ACTIVE' };
    if (locationId) where.locationId = locationId;
    
    return this.prisma.parkingSession.findMany({
      where,
      include: { vehicle: true },
      orderBy: { entryTime: 'desc' },
    });
  }

  @Get('parking/sessions')
  @ApiOperation({ summary: 'Get all parking sessions' })
  async getSessions(
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('clientType') clientType?: string,
  ) {
    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;
    if (clientType) where.clientType = clientType;

    return this.prisma.parkingSession.findMany({
      where,
      include: { vehicle: true },
      orderBy: { entryTime: 'desc' },
      take: 100,
    });
  }

  @Post('parking/sessions')
  @ApiOperation({ summary: 'Create test parking session' })
  async createSession(@Body() data: {
    plateNumber: string;
    locationId?: string;
    organizationId?: string;
    clientType?: string;
  }) {
    // If no location specified, find first location
    let locationId = data.locationId;
    let organizationId = data.organizationId;

    if (!locationId || !organizationId) {
      const locations = await this.prisma.parkingLocation.findMany({ take: 1 });
      if (locations.length > 0) {
        locationId = locationId || locations[0].id;
        organizationId = organizationId || locations[0].organizationId;
      }
    }

    // Fallback to default values
    locationId = locationId || 'default';
    organizationId = organizationId || 'default';

    const session = await this.prisma.parkingSession.create({
      data: {
        plateNumber: data.plateNumber,
        organizationId,
        status: 'ACTIVE',
        entryTime: new Date(),
        clientType: data.clientType || 'ONE_TIME',
        location: {
          connect: { id: locationId },
        },
      },
    });
    return session;
  }

  @Post('guest-passes')
  @ApiOperation({ summary: 'Create guest pass' })
  async createPass(@Body() data: any) {
    let organizationId = data.organizationId;
    
    // Auto-find organization if not provided
    if (!organizationId) {
      const locations = await this.prisma.parkingLocation.findMany({ take: 1 });
      if (locations.length > 0) {
        organizationId = locations[0].organizationId;
      }
    }
    
    organizationId = organizationId || 'default';
    
    const pass = await this.prisma.guestPass.create({
      data: {
        organizationId,
        plateNumber: data.plateNumber,
        passType: data.passType || 'SINGLE',
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validTo: data.validTo ? new Date(data.validTo) : new Date(Date.now() + 86400000),
        maxUses: data.maxUses || 1,
        usesRemaining: data.maxUses || 1,
        createdBy: data.createdBy || 'admin',
      },
    });
    return pass;
  }

  @Get('guest-passes')
  @ApiOperation({ summary: 'Get guest passes' })
  async getPasses(@Query('organizationId') organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.guestPass.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('guest-passes/:id')
  @ApiOperation({ summary: 'Revoke guest pass' })
  async revokePass(@Param('id') id: string) {
    await this.prisma.guestPass.update({
      where: { id },
      data: { validTo: new Date() },
    });
    return { success: true };
  }

  @Get('whitelist')
  @ApiOperation({ summary: 'Get whitelist' })
  async getWhitelist(@Query('organizationId') organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.whitelistRule.findMany({
      where,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('whitelist')
  @ApiOperation({ summary: 'Add to whitelist' })
  async addToWhitelist(@Body() data: {
    plateNumber: string;
    organizationId?: string;
    reason?: string;
  }) {
    return this.prisma.whitelistRule.create({
      data: {
        organizationId: data.organizationId || 'default',
        plateNumber: data.plateNumber,
        reason: data.reason,
        isActive: true,
      },
    });
  }

  @Delete('whitelist/:id')
  @ApiOperation({ summary: 'Remove from whitelist' })
  async removeFromWhitelist(@Param('id') id: string) {
    await this.prisma.whitelistRule.delete({ where: { id } });
    return { success: true };
  }

  @Get('blacklist')
  @ApiOperation({ summary: 'Get blacklist' })
  async getBlacklist(@Query('organizationId') organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.blacklistRule.findMany({
      where,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('blacklist')
  @ApiOperation({ summary: 'Add to blacklist' })
  async addToBlacklist(@Body() data: {
    plateNumber: string;
    organizationId?: string;
    reason?: string;
    alertLevel?: string;
  }) {
    return this.prisma.blacklistRule.create({
      data: {
        organizationId: data.organizationId || 'default',
        plateNumber: data.plateNumber,
        reason: data.reason,
        alertLevel: data.alertLevel || 'WARNING',
        isActive: true,
      },
    });
  }

  @Delete('blacklist/:id')
  @ApiOperation({ summary: 'Remove from blacklist' })
  async removeFromBlacklist(@Param('id') id: string) {
    await this.prisma.blacklistRule.delete({ where: { id } });
    return { success: true };
  }

  @Get('parking/tariffs')
  @ApiOperation({ summary: 'Get tariffs for location' })
  async getTariffs(@Query('locationId') locationId?: string) {
    // Return default tariffs if no locationId
    const location = await this.prisma.parkingLocation.findFirst({
      where: { isActive: true },
    });
    
    if (!location) {
      return [{
        id: 'default',
        name: 'Стандартный тариф',
        hourlyRate: 20000,
        firstFreeMinutes: 15,
        maxDailyRate: 50000,
      }];
    }
    
    return [{
      id: location.id,
      name: 'Стандартный тариф',
      hourlyRate: location.hourlyRate,
      firstFreeMinutes: location.firstFreeMinutes,
      maxDailyRate: location.maxDailyRate,
    }];
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get all devices' })
  async getDevices(@Query('organizationId') organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.edgeDevice.findMany({
      where,
      include: { location: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('cameras')
  @ApiOperation({ summary: 'Get all cameras' })
  async getCameras(@Query('organizationId') organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.parkingCamera.findMany({
      where,
      include: { location: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get subscriptions' })
  async getSubscriptions(@Query('organizationId') organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    
    return this.prisma.subscription.findMany({
      where,
      include: { vehicles: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create subscription' })
  async createSubscription(@Body() data: any) {
    return this.prisma.subscription.create({
      data: {
        organizationId: data.organizationId || 'default',
        type: data.type || 'MONTHLY',
        name: data.name,
        price: data.price,
        durationDays: data.durationDays,
        maxVisits: data.maxVisits,
        isActive: true,
      },
    });
  }

  @Get('reports/daily')
  @ApiOperation({ summary: 'Get daily report' })
  async getDailyReport(
    @Query('date') date?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    
    // Validate date
    if (isNaN(targetDate.getTime())) {
      targetDate.setHours(0, 0, 0, 0);
    } else {
      targetDate.setHours(0, 0, 0, 0);
    }
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const where: any = {
      exitTime: { gte: targetDate, lt: nextDate },
      status: 'COMPLETED',
    };
    if (organizationId) where.organizationId = organizationId;

    const sessions = await this.prisma.parkingSession.findMany({ where });
    
    const totalRevenue = sessions.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      date: targetDate.toISOString().split('T')[0],
      totalSessions: sessions.length,
      totalRevenue,
      avgDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      avgCheck: sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0,
    };
  }

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  async getRevenueReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const fromDate = from && !isNaN(Date.parse(from)) ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const toDate = to && !isNaN(Date.parse(to)) ? new Date(to) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const where: any = {
      exitTime: { gte: fromDate, lte: toDate },
      status: 'COMPLETED',
    };
    if (organizationId) where.organizationId = organizationId;

    const sessions = await this.prisma.parkingSession.findMany({ where });
    
    // Group by day
    const byDay: Record<string, { amount: number; count: number }> = {};
    for (const session of sessions) {
      if (session.exitTime) {
        const day = session.exitTime.toISOString().split('T')[0];
        if (!byDay[day]) byDay[day] = { amount: 0, count: 0 };
        byDay[day].amount += session.amount || 0;
        byDay[day].count += 1;
      }
    }

    const dailyData = Object.entries(byDay).map(([date, data]) => ({
      date,
      amount: data.amount,
      transactions: data.count,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
      totalRevenue: sessions.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalSessions: sessions.length,
      dailyData,
    };
  }
}