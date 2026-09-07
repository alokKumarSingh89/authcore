import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SigningKeyService } from './services/signing-key.service.js';
import { KeyEncryptionService } from './services/key-encryption.service.js';
import { SigningKeyBootstrap } from './signing-key.bootstrap.js';

@Module({
  imports: [JwtModule.register({})],

  providers: [SigningKeyService, KeyEncryptionService, SigningKeyBootstrap],

  exports: [SigningKeyService, KeyEncryptionService],
})
export class TokensModule {}
