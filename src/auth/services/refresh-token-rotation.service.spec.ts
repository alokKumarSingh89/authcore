import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnauthorizedException } from '@nestjs/common';

import { RefreshTokenRotationService } from './refresh-token-rotation.service.js';

describe('RefreshTokenRotationService', () => {
  let service: RefreshTokenRotationService;

  const prisma = {
    refreshToken: {
      findUnique: vi.fn(),
    },

    $transaction: vi.fn(),
  };

  const refreshTokenService = {
    hashRefreshToken: vi.fn(),

    generateRefreshToken: vi.fn(),

    getRefreshTokenTtlMs: vi.fn(),
  };

  const securityEventService = {
    record: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new RefreshTokenRotationService(
      prisma as any,
      refreshTokenService as any,
      securityEventService as any,
    );

    refreshTokenService.hashRefreshToken.mockReturnValue('hashed-token');

    refreshTokenService.generateRefreshToken.mockReturnValue(
      'new-refresh-token',
    );

    refreshTokenService.getRefreshTokenTtlMs.mockReturnValue(
      30 * 24 * 60 * 60 * 1000,
    );
  });

  it('should reject an unknown refresh token', async () => {
    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('should reject an expired refresh token', async () => {
    const storedToken = createStoredToken({
      expiresAt: new Date(Date.now() - 1000),
    });

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('token')).rejects.toThrow(
      'Refresh token expired',
    );
  });
  it('should reject a revoked refresh token', async () => {
    const storedToken = createStoredToken({
      revokedAt: new Date(),
    });

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('token')).rejects.toThrow(
      'Refresh token revoked',
    );
  });
  it('should reject an inactive token family', async () => {
    const storedToken = createStoredToken({
      tokenFamily: {
        ...createStoredToken().tokenFamily,

        status: 'COMPROMISED',
      },
    });

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('token')).rejects.toThrow(
      'Refresh token family is not active',
    );
  });
  it('should reject an inactive session', async () => {
    const base = createStoredToken();

    const storedToken = {
      ...base,

      tokenFamily: {
        ...base.tokenFamily,

        session: {
          ...base.tokenFamily.session,

          status: 'REVOKED',
        },
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('token')).rejects.toThrow(
      'Session is not active',
    );
  });
  it('should reject an inactive user', async () => {
    const base = createStoredToken();

    const storedToken = {
      ...base,

      tokenFamily: {
        ...base.tokenFamily,

        user: {
          ...base.tokenFamily.user,

          status: 'LOCKED',
        },
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('token')).rejects.toThrow('User is not active');
  });
  it('should detect refresh token reuse', async () => {
    const base = createStoredToken();

    const storedToken = {
      ...base,

      usedAt: new Date(),
    };

    const updateFamily = vi.fn();

    const updateTokens = vi.fn();

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),

          updateMany: updateTokens,
        },

        tokenFamily: {
          update: updateFamily,
        },
      };

      return callback(tx);
    });

    await expect(service.rotate('token')).rejects.toThrow(
      'Refresh token reuse detected',
    );

    expect(updateFamily).toHaveBeenCalled();

    expect(updateTokens).toHaveBeenCalled();

    expect(securityEventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REFRESH_TOKEN_REUSE',
      }),
    );
  });
  it('should rotate a valid refresh token', async () => {
    const storedToken = createStoredToken();

    const createToken = vi.fn().mockResolvedValue({
      id: 'new-token-id',
      tokenFamilyId: 'family-id',
      expiresAt: new Date(Date.now() + 86400000),
    });

    const updateToken = vi.fn().mockResolvedValue({
      count: 1,
    });

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(storedToken),

          create: createToken,

          updateMany: updateToken,
        },
      };

      return callback(tx);
    });

    const result = await service.rotate('old-token');

    expect(result.refreshToken).toBe('new-refresh-token');

    expect(createToken).toHaveBeenCalled();

    expect(updateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'token-id',
          usedAt: null,
          revokedAt: null,
        }),
      }),
    );
  });
});

const createStoredToken = (overrides = {}) => ({
  id: 'token-id',
  tokenHash: 'hashed-token',

  expiresAt: new Date(Date.now() + 60_000),

  usedAt: null,
  revokedAt: null,

  tokenFamily: {
    id: 'family-id',
    status: 'ACTIVE',

    expiresAt: new Date(Date.now() + 86400000),

    revokedAt: null,

    sessionId: 'session-id',

    userId: 'user-id',

    session: {
      id: 'session-id',
      status: 'ACTIVE',

      expiresAt: new Date(Date.now() + 86400000),

      clientId: 'order-service',
    },

    user: {
      id: 'user-id',
      status: 'ACTIVE',
    },
  },

  ...overrides,
});
