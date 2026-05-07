import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization' })
  async getOrganization(@Param('id') id: string) {
    return this.organizationsService.getOrganization(id);
  }

  @Get(':id/locations')
  @ApiOperation({ summary: 'Get organization locations' })
  async getLocations(@Param('id') id: string) {
    return this.organizationsService.getLocations(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get organization statistics' })
  async getStats(@Param('id') id: string) {
    return this.organizationsService.getOrganizationStats(id);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Create parking location' })
  async createLocation(@Body() data: any) {
    return this.organizationsService.createLocation(data);
  }
}