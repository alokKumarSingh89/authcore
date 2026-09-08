import { Module } from '@nestjs/common';
import { SessionService } from './services/session.service.js';

@Module({
  exports: [SessionService],
  providers: [SessionService],
})
export class SessionModule {}
