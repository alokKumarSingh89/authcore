import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { JwksService } from './jwks.service.js';

describe('JwksService', () => {
  it('should return public signing keys as JWKS', async () => {
    const { publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,

      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },

      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const signingKeyService = {
      getPublicKeys: vi.fn().mockResolvedValue([
        {
          keyId: 'key-1',
          algorithm: 'RS256',
          keyType: 'RSA',
          publicKey,
        },
      ]),
    };

    const service = new JwksService(signingKeyService as any);

    const result = await service.getJwks();

    expect(result.keys).toHaveLength(1);

    expect(result.keys[0]).toMatchObject({
      kid: 'key-1',
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
    });

    expect(result.keys[0].n).toBeDefined();
    expect(result.keys[0].e).toBeDefined();

    expect(signingKeyService.getPublicKeys).toHaveBeenCalledOnce();
  });
});
