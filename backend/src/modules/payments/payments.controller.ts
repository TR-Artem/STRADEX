import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create payment' })
  async createPayment(@Body() data: {
    sessionId: string;
    amount: number;
    organizationId: string;
  }) {
    return this.paymentsService.createPayment(data);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Process YooKassa webhook' })
  async processWebhook(@Body() payload: any) {
    return this.paymentsService.processWebhook(payload);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get payment by session' })
  async getPaymentBySession(@Param('sessionId') sessionId: string) {
    return this.paymentsService.getPaymentBySession(sessionId);
  }

  @Post('refund/:paymentId')
  @ApiOperation({ summary: 'Create refund' })
  async createRefund(
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number },
  ) {
    return this.paymentsService.createRefund(paymentId, body.amount);
  }
}