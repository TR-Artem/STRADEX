import { Module } from '@nestjs/common';
import { ParkingController } from './controllers/parking.controller';
import { SessionService } from './services/session.service';
import { TariffService } from './services/tariff.service';
import { WhitelistService } from './services/whitelist.service';
import { BlacklistService } from './services/blacklist.service';
import { ParkingGateway } from './gateways/parking.gateway';
import { EdgeController } from './controllers/edge.controller';
import { EdgeAuthService } from './services/edge-auth.service';
import { EdgeCommandService } from './services/edge-command.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';

@Module({
  controllers: [ParkingController, EdgeController],
  providers: [
    SessionService,
    TariffService,
    WhitelistService,
    BlacklistService,
    ParkingGateway,
    EdgeAuthService,
    EdgeCommandService,
    HmacAuthGuard,
  ],
  exports: [SessionService, TariffService, WhitelistService, BlacklistService],
})
export class ParkingModule {}