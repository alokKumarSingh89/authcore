import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { publicKeyToJwk } from './rsa-jwk.util.js';

describe('publicKeyToJwk', () => {
  it('should convert an RSA public key to JWK', () => {
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

    const jwk = publicKeyToJwk(publicKey, 'authcore-test-key');

    expect(jwk).toMatchObject({
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: 'authcore-test-key',
    });

    expect(jwk.n).toBeDefined();
    expect(jwk.e).toBeDefined();

    expect(jwk.n).not.toContain('+');
    expect(jwk.n).not.toContain('/');
    expect(jwk.n).not.toContain('=');
  });
});
