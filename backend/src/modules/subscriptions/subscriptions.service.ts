import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptions(organizationId: string) {
    return this.prisma.subscription.findMany({
      where: { organizationId, isActive: true },
    });
  }

  async createSubscription(data: any) {
    return this.prisma.subscription.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        name: data.name,
        price: data.price,
        durationDays: data.durationDays,
        maxVisits: data.maxVisits,
      },
    });
  }

  async checkSubscription(plateNumber: string, organizationId: string): Promise<{
    isValid: boolean;
    subscription?: any;
    reason?: string;
  }> {
    const now = new Date();

    const vehicleSubscription = await this.prisma.subscriptionVehicle.findFirst({
      where: {
        vehicle: { plateNumber, organizationId },
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: { subscription: true, vehicle: true },
    });

    if (!vehicleSubscription) {
      return { isValid: false, reason: 'No active subscription found' };
    }

    // Check visits remaining
    if (vehicleSubscription.visitsRemaining !== null && vehicleSubscription.visitsRemaining <= 0) {
      return { isValid: false, reason: 'No visits remaining' };
    }

    // Check balance remaining
    if (vehicleSubscription.balanceRemaining !== null && vehicleSubscription.balanceRemaining <= 0) {
      return { isValid: false, reason: 'No balance remaining' };
    }

    return { isValid: true, subscription: vehicleSubscription };
  }

  async useSubscription(subscriptionVehicleId: string) {
    const sv = await this.prisma.subscriptionVehicle.findUnique({
      where: { id: subscriptionVehicleId },
    });

    if (!sv) return;

    const updates: any = {};
    if (sv.visitsRemaining !== null) {
      updates.visitsRemaining = { decrement: 1 };
    }

    return this.prisma.subscriptionVehicle.update({
      where: { id: subscriptionVehicleId },
      data: updates,
    });
  }
}