import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GuestPassService {
  private readonly logger = new Logger(GuestPassService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPass(data: {
    organizationId: string;
    plateNumber: string;
    passType: 'SINGLE' | 'MULTIPLE' | 'PERIOD' | 'QR_CODE';
    validFrom: Date;
    validTo: Date;
    maxUses?: number;
    createdBy: string;
  }): Promise<any> {
    const qrCode = data.passType === 'QR_CODE' 
      ? crypto.randomUUID().replace(/-/g, '').toUpperCase()
      : null;

    const pass = await this.prisma.guestPass.create({
      data: {
        ...data,
        usesRemaining: data.maxUses || 1,
        qrCode,
      },
    });

    this.logger.log(`Guest pass created: ${pass.id} for plate ${data.plateNumber}`);
    return pass;
  }

  async validatePass(plateNumber: string, organizationId: string): Promise<{
    isValid: boolean;
    passId?: string;
    reason?: string;
  }> {
    const pass = await this.prisma.guestPass.findFirst({
      where: {
        organizationId,
        plateNumber,
        isUsed: false,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
        usesRemaining: { gt: 0 },
      },
    });

    if (!pass) {
      return { isValid: false, reason: 'No valid pass found' };
    }

    return { isValid: true, passId: pass.id };
  }

  async usePass(passId: string): Promise<void> {
    await this.prisma.guestPass.update({
      where: { id: passId },
      data: {
        usesRemaining: { decrement: 1 },
        isUsed: true,
      },
    });
  }

  async getPasses(organizationId: string): Promise<any[]> {
    return this.prisma.guestPass.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokePass(passId: string): Promise<void> {
    await this.prisma.guestPass.update({
      where: { id: passId },
      data: { validTo: new Date() },
    });
  }
}