import { describe, expect, it, vi } from 'vitest';

import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('should return JWT payload from validate', () => {
    const configService = {
      getOrThrow: vi.fn().mockReturnValue('authcore'),
    };

    const jwtKeyService = {
      getPublicKey: vi.fn(),
    };

    const strategy = new JwtStrategy(
      configService as any,
      jwtKeyService as any,
    );

    const payload = {
      sub: 'user-123',
      iss: 'authcore',
      aud: 'order-service',
      sid: 'session-123',
      jti: 'token-123',
      iat: 1000,
      exp: 2000,
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });
});
