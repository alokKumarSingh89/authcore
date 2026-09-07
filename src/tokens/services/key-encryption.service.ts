import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class KeyEncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  private readonly key: Buffer;
  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.getOrThrow<string>(
      'authcore.keyEncryptionKey',
    );
    this.key = Buffer.from(encryptionKey, 'hex');
    if (this.key.length !== 32) {
      throw new Error('AUTHCORE_KEY_ENCRYPTION_KEY must be exactly 32 bytes');
    }
  }
  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }
  decrypt(value: string): string {
    const [ivBase64, authTagBase64, encryptedBase64] = value.split('.');
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
      throw new BadRequestException('Invalid encrypted value');
    }
    const iv = Buffer.from(ivBase64, 'base64');

    const authTag = Buffer.from(authTagBase64, 'base64');

    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
