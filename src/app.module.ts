import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { validateEnvironment } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'authcore',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    HealthModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
