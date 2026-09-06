import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from './password.service.js';
import { SecurityEventService } from '../../security/security-event.service.js';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  async validateUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      include: {
        credential: true,
      },
    });

    if (!user || !user.credential) {
      await this.securityEventService.record({
        type: 'LOGIN_FAILED',
        metadata: {
          reason: 'INVALID_CREDENTIALS',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      await this.securityEventService.record({
        type: 'LOGIN_FAILED',
        userId: user.id,
        metadata: {
          reason: 'ACCOUNT_NOT_ACTIVE',
          status: user.status,
        },
      });
      throw new UnauthorizedException('Account is not active');
    }

    const passwordValid = await this.passwordService.verify(
      user.credential.passwordHash,
      password,
    );

    if (!passwordValid) {
      await this.securityEventService.record({
        type: 'LOGIN_FAILED',
        userId: user.id,
        metadata: {
          reason: 'INVALID_CREDENTIALS',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.securityEventService.record({
      type: 'LOGIN_SUCCESS',
      userId: user.id,
      metadata: {
        method: 'PASSWORD',
      },
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    };
  }
}
