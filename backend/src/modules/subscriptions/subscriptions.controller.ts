import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  async getSubscriptions(@Query('organizationId') organizationId: string) {
    return this.subscriptionsService.getSubscriptions(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create subscription' })
  async createSubscription(@Body() data: any) {
    return this.subscriptionsService.createSubscription(data);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check subscription validity' })
  async checkSubscription(@Body() data: { plateNumber: string; organizationId: string }) {
    return this.subscriptionsService.checkSubscription(data.plateNumber, data.organizationId);
  }
}