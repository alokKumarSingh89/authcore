import { Module } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorService,
  TerminusModule,
} from '@nestjs/terminus';

import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule.forRoot()],
  controllers: [HealthController],
  // providers: [HealthCheckService, HealthIndicatorService],
})
export class HealthModule {}
