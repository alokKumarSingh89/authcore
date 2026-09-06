import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { SecurityEventService } from './security-event.service.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [SecurityEventService],
  exports: [SecurityEventService],
})
export class SecurityModule {}
