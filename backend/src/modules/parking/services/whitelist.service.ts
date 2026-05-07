import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WhitelistService {
  private readonly logger = new Logger(WhitelistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if vehicle is whitelisted
   */
  async isWhitelisted(plateNumber: string, organizationId: string): Promise<boolean> {
    const rule = await this.prisma.whitelistRule.findFirst({
      where: {
        organizationId,
        plateNumber,
        isActive: true,
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
    });

    return !!rule;
  }

  /**
   * Add vehicle to whitelist
   */
  async addToWhitelist(data: {
    organizationId: string;
    plateNumber: string;
    vehicleId?: string;
    reason?: string;
    validFrom?: Date;
    validTo?: Date;
  }): Promise<any> {
    return this.prisma.whitelistRule.create({ data });
  }

  /**
   * Remove vehicle from whitelist
   */
  async removeFromWhitelist(id: string): Promise<void> {
    await this.prisma.whitelistRule.delete({ where: { id } });
  }

  /**
   * Get all whitelist rules for organization
   */
  async getWhitelist(organizationId: string): Promise<any[]> {
    return this.prisma.whitelistRule.findMany({
      where: { organizationId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}