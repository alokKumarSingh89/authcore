import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SigningKeyService } from './services/signing-key.service.js';
import { KeyEncryptionService } from './services/key-encryption.service.js';
import { TokenService } from './token.service.js';
import { JwksController } from './jwks.controller.js';
import { JwksService } from './services/jwks.service.js';
import { JwtKeyService } from './services/jwt-key.service.js';
import { SigningKeyProvisionerService } from './services/signing-key-provisioner.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [JwksController],
  providers: [
    KeyEncryptionService,
    SigningKeyService,
    JwksService,
    TokenService,
    JwtKeyService,
    SigningKeyProvisionerService,
  ],

  exports: [
    SigningKeyService,
    KeyEncryptionService,
    SigningKeyProvisionerService,
    JwksService,
    JwtKeyService,
    TokenService,
  ],
})
export class TokensModule {}
