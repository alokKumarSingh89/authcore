import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { durationToMs } from '../../common/utils/duration.util.js';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}
  getRefreshTokenTtlMs(): number {
    const ttl = this.configService.get<string>('jwt.refreshTokenTtl', '30d');

    return durationToMs(ttl);
  }
  async createRefreshToken(params: {
    tokenFamilyId: string;
    familyExpiresAt: Date;
  }) {
    const token = this.generateRefreshToken();

    const expiresAt = this.getRefreshTokenExpiration(params.familyExpiresAt);
    const tokenHash = this.hashRefreshToken(token);
    await this.prisma.refreshToken.create({
      data: {
        tokenFamilyId: params.tokenFamilyId,
        tokenHash,
        expiresAt,
      },
    });
    return {
      token,
      expiresAt,
    };
  }

  async createTokenFamily(params: { userId: string; sessionId: string }) {
    const refreshTokenTtl = this.configService.get<string>(
      'jwt.refreshTokenTtl',
      '30d',
    );
    const expiresAt = new Date(Date.now() + durationToMs(refreshTokenTtl));
    return this.prisma.tokenFamily.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        status: 'ACTIVE',
        expiresAt,
      },
    });
  }
  generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  async storeRefreshToken(params: {
    tokenFamilyId: string;
    token: string;
    expiresAt: Date;
  }) {
    const tokenHash = this.hashRefreshToken(params.token);
    return this.prisma.refreshToken.create({
      data: {
        tokenFamilyId: params.tokenFamilyId,
        tokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }
  private getRefreshTokenExpiration(familyExpiresAt: Date): Date {
    const configuredTtl = this.configService.get<string>(
      'jwt.refreshTokenTtl',
      '30d',
    );

    const tokenExpiresAt = new Date(Date.now() + durationToMs(configuredTtl));

    return tokenExpiresAt < familyExpiresAt ? tokenExpiresAt : familyExpiresAt;
  }
}
