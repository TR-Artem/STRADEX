import { Controller, Post, Get, Body, Param, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionService } from '../services/session.service';
import { EdgeAuthService } from '../services/edge-auth.service';
import { EdgeCommandService } from '../services/edge-command.service';
import { EntryEventDto, ExitEventDto } from '../dto/session.dto';

@ApiTags('Edge')
@Controller('parking')
export class EdgeController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly edgeAuthService: EdgeAuthService,
    private readonly edgeCommandService: EdgeCommandService,
  ) {}

  @Post('entry')
  @HttpCode(201)
  @ApiOperation({ summary: 'Process vehicle entry from ALPR camera' })
  async entry(@Body() dto: EntryEventDto, @Req() req: any) {
    const organizationId = req.hmac?.organizationId;
    return this.sessionService.processEntry(dto, organizationId);
  }

  @Post('exit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Process vehicle exit from ALPR camera' })
  async exit(@Body() dto: ExitEventDto, @Req() req: any) {
    const organizationId = req.hmac?.organizationId;
    return this.sessionService.processExit(dto, organizationId);
  }

  @Post('health')
  @HttpCode(200)
  @ApiOperation({ summary: 'Process device health heartbeat' })
  async health(@Body() dto: any, @Req() req: any) {
    await this.edgeAuthService.processHeartbeat(dto, req.hmac?.organizationId);
    return { acknowledged: true };
  }

  @Get('commands/:deviceId')
  @ApiOperation({ summary: 'Get pending commands for device' })
  async getCommands(@Param('deviceId') deviceId: string, @Req() req: any) {
    return this.edgeCommandService.getCommandsForDevice(deviceId, req.hmac?.organizationId);
  }

  @Post('commands/:commandId/ack')
  @HttpCode(200)
  @ApiOperation({ summary: 'Acknowledge command execution' })
  async ackCommand(@Param('commandId') commandId: string, @Body() dto: any) {
    await this.edgeCommandService.ackCommand(commandId, dto);
    return { acknowledged: true };
  }
}