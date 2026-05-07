import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionService } from '../services/session.service';
import { TariffService } from '../services/tariff.service';
import { WhitelistService } from '../services/whitelist.service';
import { BlacklistService } from '../services/blacklist.service';
import { SessionFilterDto, StatisticsDto } from '../dto/session.dto';

@ApiTags('Parking')
@Controller('parking')
export class ParkingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly tariffService: TariffService,
    private readonly whitelistService: WhitelistService,
    private readonly blacklistService: BlacklistService,
  ) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Get parking sessions' })
  async getSessions(@Query() filters: SessionFilterDto, @Request() req: any) {
    const organizationId = req.user?.organizationId;
    return this.sessionService.getActiveSessions(filters.locationId || '');
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active sessions' })
  async getActiveSessions(@Query('locationId') locationId: string) {
    return this.sessionService.getActiveSessions(locationId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStatistics(@Query('locationId') locationId: string, @Request() req: any) {
    const organizationId = req.user?.organizationId;
    return this.sessionService.getStatistics(organizationId, locationId);
  }

  // Tariffs are handled by DashboardController

  @Get('whitelist')
  @ApiOperation({ summary: 'Get whitelist' })
  async getWhitelist(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    return this.whitelistService.getWhitelist(organizationId);
  }

  @Post('whitelist')
  @ApiOperation({ summary: 'Add to whitelist' })
  async addToWhitelist(@Body() data: any, @Request() req: any) {
    data.organizationId = req.user?.organizationId;
    return this.whitelistService.addToWhitelist(data);
  }

  @Delete('whitelist/:id')
  @ApiOperation({ summary: 'Remove from whitelist' })
  async removeFromWhitelist(@Param('id') id: string) {
    return this.whitelistService.removeFromWhitelist(id);
  }

  @Get('blacklist')
  @ApiOperation({ summary: 'Get blacklist' })
  async getBlacklist(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    return this.blacklistService.getBlacklist(organizationId);
  }

  @Post('blacklist')
  @ApiOperation({ summary: 'Add to blacklist' })
  async addToBlacklist(@Body() data: any, @Request() req: any) {
    data.organizationId = req.user?.organizationId;
    return this.blacklistService.addToBlacklist(data);
  }

  @Delete('blacklist/:id')
  @ApiOperation({ summary: 'Remove from blacklist' })
  async removeFromBlacklist(@Param('id') id: string) {
    return this.blacklistService.removeFromBlacklist(id);
  }

  @Get('locations')
  @ApiOperation({ summary: 'Get all locations' })
  async getLocations(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    return this.prisma.parkingLocation.findMany({
      where: { organizationId, isActive: true },
    });
  }
}