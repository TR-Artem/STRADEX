import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'stradex-parking',
      version: '1.0.0',
    };
  }

  @Get('api/v1/health')
  checkApi() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'stradex-parking',
      version: '1.0.0',
    };
  }
}