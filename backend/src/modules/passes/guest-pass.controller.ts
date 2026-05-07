import { Controller, Post, Get, Body, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GuestPassService } from './guest-pass.service';

@ApiTags('Guest Passes')
@Controller('guest-passes')
export class GuestPassController {
  constructor(private readonly guestPassService: GuestPassService) {}

  @Post()
  @ApiOperation({ summary: 'Create guest pass' })
  async createPass(@Body() data: any) {
    return this.guestPassService.createPass(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all guest passes' })
  async getPasses(@Query('organizationId') organizationId: string) {
    return this.guestPassService.getPasses(organizationId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate guest pass' })
  async validatePass(@Body() data: { plateNumber: string; organizationId: string }) {
    return this.guestPassService.validatePass(data.plateNumber, data.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke guest pass' })
  async revokePass(@Param('id') id: string) {
    return this.guestPassService.revokePass(id);
  }
}