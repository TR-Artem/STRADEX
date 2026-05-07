import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily report' })
  async getDailyReport(
    @Query('organizationId') organizationId: string,
    @Query('locationId') locationId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getDailyReport(organizationId, locationId, new Date(date));
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  async getRevenueReport(
    @Query('organizationId') organizationId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.reportsService.getRevenueReport(
      organizationId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}