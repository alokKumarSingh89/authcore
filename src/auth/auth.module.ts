import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './services/password.service.js';
import { AuthenticationService } from './services/authentication.service.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { SessionModule } from '../sessions/sessions.module.js';
import { TokensModule } from '../tokens/tokens.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RefreshTokenService } from './services/refresh-token.service.js';
import { RefreshTokenRotationService } from './services/refresh-token-rotation.service.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'local' }),
    SessionModule,
    TokensModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AuthenticationService,
    LocalStrategy,
    JwtAuthGuard,
    JwtStrategy,
    RefreshTokenService,
    RefreshTokenRotationService,
  ],
})
export class AuthModule {}
