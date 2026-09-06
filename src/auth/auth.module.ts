import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './services/password.service.js';
import { AuthenticationService } from './services/authentication.service.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'local' })],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AuthenticationService,
    LocalStrategy,
  ],
})
export class AuthModule {}
