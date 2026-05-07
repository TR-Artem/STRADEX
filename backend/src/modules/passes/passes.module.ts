import { Module } from '@nestjs/common';
import { GuestPassController } from './guest-pass.controller';
import { GuestPassService } from './guest-pass.service';

@Module({
  controllers: [GuestPassController],
  providers: [GuestPassService],
  exports: [GuestPassService],
})
export class PassesModule {}