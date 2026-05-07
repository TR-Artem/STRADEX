import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TariffService {
  private readonly logger = new Logger(TariffService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateAmount(
    locationId: string,
    durationMinutes: number,
    entryTime: Date,
  ): Promise<number> {
    const location = await this.prisma.parkingLocation.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return 0;
    }

    // Apply free period first
    if (durationMinutes <= location.firstFreeMinutes) {
      return 0;
    }

    const billableMinutes = durationMinutes - location.firstFreeMinutes;
    return Math.ceil(billableMinutes / 60) * location.hourlyRate;
  }

  async getTariffs(locationId: string) {
    const location = await this.prisma.parkingLocation.findUnique({
      where: { id: locationId },
    });
    
    if (!location) {
      return [];
    }

    return [{
      id: 'default',
      name: 'Standard Tariff',
      hourlyRate: location.hourlyRate,
      firstFreeMinutes: location.firstFreeMinutes,
      maxDailyRate: location.maxDailyRate,
    }];
  }
}