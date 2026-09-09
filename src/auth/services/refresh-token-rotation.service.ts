import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { SecurityEventService } from '../../security/security-event.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class RefreshTokenRotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly securityEventService: SecurityEventService,
  ) {}
  async rotate(rawRefreshToken: string) {
    const tokenHash =
      this.refreshTokenService.hashRefreshToken(rawRefreshToken);
    const result = await this.prisma
      .$transaction(async (tx) => {
        const storedToken = await tx.refreshToken.findUnique({
          where: { tokenHash },
          include: {
            tokenFamily: {
              include: { session: true, user: true },
            },
          },
        });
        if (!storedToken) {
          throw new UnauthorizedException('Invalid refresh token');
        }
        const now = new Date();

        const family = storedToken.tokenFamily;

        const session = family.session;

        const user = family.user;
        /*
         * --------------------------------------------------
         * Validate refresh token
         * --------------------------------------------------
         */
        if (storedToken.expiresAt <= now) {
          throw new UnauthorizedException('Refresh token expired');
        }
        if (storedToken.revokedAt) {
          throw new UnauthorizedException('Refresh token revoked');
        }
        /*
         * A token that has already been used is
         * potentially a replay/reuse attack.
         */
        if (storedToken.usedAt) {
          await this.compromiseFamily(tx, family.id, user.id, session.id);

          return {
            reuseDetected: true as const,
          };
        }
        /*
         * --------------------------------------------------
         * Validate token family
         * --------------------------------------------------
         */
        if (family.status !== 'ACTIVE') {
          throw new UnauthorizedException('Refresh token family is not active');
        }
        if (family.expiresAt <= now) {
          throw new UnauthorizedException('Refresh token family expired');
        }
        /*
         * --------------------------------------------------
         * Validate session
         * --------------------------------------------------
         */

        if (session.status !== 'ACTIVE') {
          throw new UnauthorizedException('Session is not active');
        }

        if (session.expiresAt <= now) {
          throw new UnauthorizedException('Session expired');
        }
        /*
         * --------------------------------------------------
         * Validate user
         * --------------------------------------------------
         */

        if (user.status !== 'ACTIVE') {
          throw new UnauthorizedException('User is not active');
        }

        /*
         * --------------------------------------------------
         * Generate next refresh token
         * --------------------------------------------------
         */
        const newRawToken = this.refreshTokenService.generateRefreshToken();
        const newTokenHash =
          this.refreshTokenService.hashRefreshToken(newRawToken);
        const newExpiresAt = this.getTokenExpiration(family.expiresAt);
        /*
         * Create token B first.
         *
         * If the conditional update below fails,
         * the entire transaction rolls back.
         */
        const newToken = await tx.refreshToken.create({
          data: {
            tokenFamilyId: family.id,
            tokenHash: newTokenHash,
            expiresAt: newExpiresAt,
          },
        });
        /*
         * --------------------------------------------------
         * Atomically consume token A
         * --------------------------------------------------
         *
         * This is the important concurrency protection.
         *
         * Only a token whose usedAt/revokedAt are NULL
         * can be consumed.
         */
        const consumed = await tx.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            usedAt: null,
            revokedAt: null,
          },
          data: {
            usedAt: now,
            replacedByTokenId: newToken.id,
          },
        });
        /*
         * If another request consumed this token first,
         * PostgreSQL will wait for that row update and then
         * re-check the condition.
         *
         * Therefore only one request should get count = 1.
         */
        if (consumed.count !== 1) {
          throw new RefreshTokenRaceError();
        }
        return {
          user,
          session,
          family,
          refreshToken: newRawToken,
          refreshTokenExpiresAt: newExpiresAt,
        };
      })
      .catch(async (error) => {
        /*
         * A concurrent request may have consumed the token.
         *
         * In that case detect the now-used token and
         * compromise the entire family.
         */
        if (error instanceof RefreshTokenRaceError) {
          await this.handleReuseAfterRace(tokenHash);
        }
        throw error instanceof RefreshTokenRaceError
          ? new UnauthorizedException('Refresh token reuse detected')
          : error;
      });

    if (result.reuseDetected) {
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    return result;
  }
  private getTokenExpiration(familyExpiresAt: Date): Date {
    const configuredTtl = this.refreshTokenService.getRefreshTokenTtlMs();
    const configuredExpiration = new Date(Date.now() + configuredTtl);
    return configuredExpiration < familyExpiresAt
      ? configuredExpiration
      : familyExpiresAt;
  }
  private async compromiseFamily(
    tx: Prisma.TransactionClient,
    familyId: string,
    userId: string,
    sessionId: string,
  ) {
    const now = new Date();

    await tx.tokenFamily.update({
      where: {
        id: familyId,
      },
      data: {
        status: 'COMPROMISED',
        revokedAt: now,
      },
    });

    await tx.refreshToken.updateMany({
      where: {
        tokenFamilyId: familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.securityEvent.create({
      data: {
        type: 'REFRESH_TOKEN_REUSE',
        userId,
        metadata: {
          sessionId,
          tokenFamilyId: familyId,
        },
      },
    });
  }

  private async handleReuseAfterRace(tokenHash: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },

      include: {
        tokenFamily: {
          include: {
            session: true,
            user: true,
          },
        },
      },
    });
    if (!token) {
      return;
    }

    if (!token.usedAt) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.compromiseFamily(
        tx,
        token.tokenFamilyId,
        token.tokenFamily.userId,
        token.tokenFamily.sessionId,
      );
    });
  }
}

class RefreshTokenRaceError extends Error {
  constructor() {
    super('Refresh token was consumed concurrently');
  }
}
