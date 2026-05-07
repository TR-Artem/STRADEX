import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.shopId = this.configService.get('YOOKASSA_SHOP_ID', '');
    this.secretKey = this.configService.get('YOOKASSA_SECRET_KEY', '');
  }

  /**
   * Create payment via YooKassa
   */
  async createPayment(data: {
    sessionId: string;
    amount: number; // in kopecks
    organizationId: string;
  }): Promise<{
    paymentId: string;
    checkoutUrl: string;
  }> {
    if (!this.shopId || !this.secretKey) {
      throw new BadRequestException('YooKassa not configured');
    }

    // Get session details
    const session = await this.prisma.parkingSession.findUnique({
      where: { id: data.sessionId },
      include: { location: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Create payment in YooKassa
    const paymentId = crypto.randomUUID();
    const idempotenceKey = `payment_${paymentId}`;

    // For demo purposes, return mock payment URL
    // In production, integrate with actual YooKassa API
    const checkoutUrl = `https://yoomoney.ru/checkout/payments/${paymentId}`;

    // Save payment record
    await this.prisma.payment.create({
      data: {
        id: paymentId,
        organizationId: data.organizationId,
        sessionId: data.sessionId,
        amount: data.amount,
        method: 'CARD',
        status: 'PENDING',
        yookassaPaymentId: paymentId,
        yookassaCheckoutUrl: checkoutUrl,
      },
    });

    // Update session with payment info
    await this.prisma.parkingSession.update({
      where: { id: data.sessionId },
      data: {
        paymentMethod: 'SBP',
      },
    });

    this.logger.log(`Payment created: ${paymentId} for session ${data.sessionId}, amount: ${data.amount}`);

    return { paymentId, checkoutUrl };
  }

  /**
   * Process webhook from YooKassa
   */
  async processWebhook(payload: any): Promise<void> {
    const { object: payment } = payload;

    if (payment.status === 'succeeded') {
      const paymentRecord = await this.prisma.payment.findFirst({
        where: { yookassaPaymentId: payment.id },
      });

      if (paymentRecord && paymentRecord.sessionId) {
        // Update payment status
        await this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        // Update session
        await this.prisma.parkingSession.update({
          where: { id: paymentRecord.sessionId },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paidAt: new Date(),
          },
        });

        this.logger.log(`Payment succeeded: ${payment.id}`);
      }
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId: string, amount?: number): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // In production, call YooKassa refund API
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    if (payment.sessionId) {
      await this.prisma.parkingSession.update({
        where: { id: payment.sessionId },
        data: { paymentStatus: 'REFUNDED' },
      });
    }

    this.logger.log(`Refund processed: ${paymentId}`);
  }

  /**
   * Get payment by session
   */
  async getPaymentBySession(sessionId: string) {
    return this.prisma.payment.findFirst({
      where: { sessionId },
    });
  }
}