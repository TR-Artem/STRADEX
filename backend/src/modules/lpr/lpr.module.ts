import { Module } from '@nestjs/common';
import { LPRService } from './lpr.service';
import { LPRController } from './lpr.controller';

@Module({
  providers: [LPRService],
  controllers: [LPRController],
  exports: [LPRService],
})
export class LPRModule {}