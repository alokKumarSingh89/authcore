import { generateKeyPairSync, randomUUID } from 'node:crypto';

export function generateSigningKey() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
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

  return {
    keyId: `authcore-${randomUUID()}`,
    algorithm: 'RS256',
    keyType: 'RSA',
    publicKey,
    privateKey,
  };
}
