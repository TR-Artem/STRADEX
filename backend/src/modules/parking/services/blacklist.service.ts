import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if vehicle is blacklisted
   */
  async checkBlacklist(
    plateNumber: string,
    organizationId: string,
  ): Promise<{
    isBlacklisted: boolean;
    alertLevel?: 'WARNING' | 'CRITICAL';
    reason?: string;
  }> {
    const rule = await this.prisma.blacklistRule.findFirst({
      where: {
        organizationId,
        plateNumber,
        isActive: true,
      },
    });

    if (!rule) {
      return { isBlacklisted: false };
    }

    return {
      isBlacklisted: true,
      alertLevel: rule.alertLevel as 'WARNING' | 'CRITICAL',
      reason: rule.reason || undefined,
    };
  }

  /**
   * Add vehicle to blacklist
   */
  async addToBlacklist(data: {
    organizationId: string;
    plateNumber: string;
    vehicleId?: string;
    reason?: string;
    alertLevel?: 'WARNING' | 'CRITICAL';
  }): Promise<any> {
    return this.prisma.blacklistRule.create({ data });
  }

  /**
   * Remove vehicle from blacklist
   */
  async removeFromBlacklist(id: string): Promise<void> {
    await this.prisma.blacklistRule.delete({ where: { id } });
  }

  /**
   * Get all blacklist rules for organization
   */
  async getBlacklist(organizationId: string): Promise<any[]> {
    return this.prisma.blacklistRule.findMany({
      where: { organizationId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}