import { createPublicKey, KeyObject } from 'node:crypto';

export interface RsaJwk {
  kty: 'RSA';
  use: 'sig';
  alg: 'RS256';
  kid: string;
  n: string;
  e: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function publicKeyToJwk(publicKeyPem: string, keyId: string): RsaJwk {
  const keyObject: KeyObject = createPublicKey(publicKeyPem);

  const jwk = keyObject.export({
    format: 'jwk',
  });

  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw new Error('Invalid RSA public key');
  }

  return {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid: keyId,
    n: jwk.n,
    e: jwk.e,
  };
}
