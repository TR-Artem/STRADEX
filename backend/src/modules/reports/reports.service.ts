import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyReport(organizationId: string, locationId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.parkingSession.findMany({
      where: {
        organizationId,
        locationId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const totalRevenue = completedSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = completedSessions.length > 0 
      ? Math.round(totalDuration / completedSessions.length) 
      : 0;

    const entries = sessions.filter(s => s.entryTime >= startOfDay && s.entryTime <= endOfDay);
    const exits = completedSessions.filter(s => s.exitTime && s.exitTime >= startOfDay && s.exitTime <= endOfDay);

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'ACTIVE').length,
      completedSessions: completedSessions.length,
      totalRevenue,
      avgDuration,
      entryCount: entries.length,
      exitCount: exits.length,
    };
  }

  async getRevenueReport(organizationId: string, dateFrom: Date, dateTo: Date) {
    const sessions = await this.prisma.parkingSession.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        exitTime: { gte: dateFrom, lte: dateTo },
      },
    });

    const byDay: Record<string, { amount: number; count: number }> = {};

    for (const session of sessions) {
      const day = session.exitTime?.toISOString().split('T')[0] || 'unknown';
      if (!byDay[day]) {
        byDay[day] = { amount: 0, count: 0 };
      }
      byDay[day].amount += session.amount || 0;
      byDay[day].count += 1;
    }

    return Object.entries(byDay).map(([date, data]) => ({
      date,
      revenue: data.amount,
      sessions: data.count,
    }));
  }
}