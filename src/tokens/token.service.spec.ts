import { describe, expect, it, vi } from 'vitest';

import { TokenService } from './token.service.js';

describe('TokenService', () => {
  it('should create an RS256 access token', async () => {
    const jwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-jwt'),
    };

    const configService = {
      getOrThrow: vi.fn().mockReturnValue('authcore'),

      get: vi.fn().mockReturnValue('10m'),
    };

    const signingKeyService = {
      getPrivateKey: vi.fn().mockResolvedValue({
        keyId: 'authcore-test-key',
        algorithm: 'RS256',
        keyType: 'RSA',
        privateKey: 'PRIVATE_KEY',
      }),
    };

    const service = new TokenService(
      jwtService as any,
      configService as any,
      signingKeyService as any,
    );

    const token = await service.createAccessToken({
      userId: 'user-123',
      sessionId: 'session-123',
      clientId: 'web-app',
      audience: 'order-service',
      scope: ['orders:read', 'orders:create'],
    });

    expect(token).toBe('signed-jwt');

    expect(signingKeyService.getPrivateKey).toHaveBeenCalledOnce();

    expect(jwtService.signAsync).toHaveBeenCalledOnce();

    const [payload, options] = jwtService.signAsync.mock.calls[0];

    expect(payload).toMatchObject({
      sub: 'user-123',
      sid: 'session-123',
      client_id: 'web-app',
      scope: 'orders:read orders:create',
    });

    expect(options).toMatchObject({
      algorithm: 'RS256',
      issuer: 'authcore',
      audience: 'order-service',
      expiresIn: '10m',
      keyid: 'authcore-test-key',
      privateKey: 'PRIVATE_KEY',
    });

    expect(options.jwtid).toBeDefined();
  });
});
