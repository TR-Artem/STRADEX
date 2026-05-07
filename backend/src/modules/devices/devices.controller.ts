import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DevicesService } from './devices.service';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  async getDevices(
    @Query('organizationId') organizationId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.devicesService.getDevices(organizationId, locationId);
  }

  @Get('cameras')
  @ApiOperation({ summary: 'Get all cameras' })
  async getCameras(
    @Query('organizationId') organizationId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.devicesService.getCameras(organizationId, locationId);
  }
}