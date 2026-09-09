import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RefreshTokenService } from './refresh-token.service.js';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  const prisma = {
    tokenFamily: {
      create: vi.fn(),
    },

    refreshToken: {
      create: vi.fn(),
    },
  };

  const configService = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    configService.get.mockReturnValue('30d');

    service = new RefreshTokenService(prisma as any, configService as any);
  });

  describe('generateRefreshToken', () => {
    it('should generate a token', () => {
      const token = service.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    });

    it('should generate different tokens', () => {
      const tokenA = service.generateRefreshToken();

      const tokenB = service.generateRefreshToken();

      expect(tokenA).not.toBe(tokenB);
    });
  });

  describe('hashRefreshToken', () => {
    it('should produce a SHA-256 hash', () => {
      const token = 'test-refresh-token';

      const hash = service.hashRefreshToken(token);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should deterministically hash the same token', () => {
      const token = 'test-refresh-token';

      const hashA = service.hashRefreshToken(token);

      const hashB = service.hashRefreshToken(token);

      expect(hashA).toBe(hashB);
    });

    it('should produce different hashes for different tokens', () => {
      const hashA = service.hashRefreshToken('token-a');

      const hashB = service.hashRefreshToken('token-b');

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('getRefreshTokenTtlMs', () => {
    it('should convert configured TTL', () => {
      configService.get.mockReturnValue('30d');

      expect(service.getRefreshTokenTtlMs()).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });
  describe('createRefreshToken', () => {
    it('should store only the hash', async () => {
      const rawToken = 'secret-refresh-token';

      vi.spyOn(service, 'generateRefreshToken').mockReturnValue(rawToken);

      prisma.refreshToken.create.mockResolvedValue({
        id: 'refresh-id',
        tokenFamilyId: 'family-id',
        tokenHash: service.hashRefreshToken(rawToken),
        expiresAt: new Date(),
      });

      await service.createRefreshToken({
        tokenFamilyId: 'family-id',
        familyExpiresAt: new Date(Date.now() + 86400000),
      });

      const call = prisma.refreshToken.create.mock.calls[0][0];

      expect(call.data.tokenHash).toBe(service.hashRefreshToken(rawToken));

      expect(call.data.tokenHash).not.toBe(rawToken);
    });
  });
});
