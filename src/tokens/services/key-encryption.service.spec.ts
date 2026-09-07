import { describe, expect, it } from 'vitest';

import { KeyEncryptionService } from './key-encryption.service.js';

describe('KeyEncryptionService', () => {
  const encryptionKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const configService = {
    getOrThrow: () => encryptionKey,
  };

  it('should encrypt and decrypt a value', () => {
    const service = new KeyEncryptionService(configService as any);

    const original =
      '-----BEGIN PRIVATE KEY-----secret-----END PRIVATE KEY-----';

    const encrypted = service.encrypt(original);

    expect(encrypted).not.toBe(original);

    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for the same value', () => {
    const service = new KeyEncryptionService(configService as any);

    const value = 'private-key';

    const encryptedA = service.encrypt(value);

    const encryptedB = service.encrypt(value);

    expect(encryptedA).not.toBe(encryptedB);
  });

  it('should reject tampered ciphertext', () => {
    const service = new KeyEncryptionService(configService as any);

    const encrypted = service.encrypt('private-key');

    const parts = encrypted.split('.');

    // Change one existing Base64 character in the ciphertext.
    const originalCiphertext = parts[2];

    const replacement = originalCiphertext[0] === 'A' ? 'B' : 'A';

    parts[2] = replacement + originalCiphertext.slice(1);

    expect(() => service.decrypt(parts.join('.'))).toThrow();
  });
});
