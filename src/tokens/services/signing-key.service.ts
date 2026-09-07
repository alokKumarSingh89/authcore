import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { KeyEncryptionService } from './key-encryption.service.js';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

@Injectable()
export class SigningKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keyEncryptionService: KeyEncryptionService,
  ) {}
  async createInitialKey() {
    const existingKey = await this.prisma.signingKey.findFirst({
      where: {
        status: 'ACTIVE',
      },
    });
    if (existingKey) {
      return existingKey;
    }
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
    const keyId = `authcore-${randomUUID()}`;

    const privateKeyEncrypted = this.keyEncryptionService.encrypt(privateKey);
    return this.prisma.signingKey.create({
      data: {
        keyId,
        algorithm: 'RS256',
        keyType: 'RSA',
        publicKey,
        privateKeyEncrypted,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
  }
  async getActiveSigningKey() {
    const key = await this.prisma.signingKey.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        activatedAt: 'desc',
      },
    });
    if (!key) {
      throw new InternalServerErrorException(
        'No active signing key configured',
      );
    }

    return key;
  }
  async getPrivateKey() {
    const key = await this.getActiveSigningKey();
    return {
      keyId: key.keyId,
      algorithm: key.algorithm,
      keyType: key.keyType,
      privateKey: this.keyEncryptionService.decrypt(key.privateKeyEncrypted),
    };
  }
  async getPublicKeys() {
    return this.prisma.signingKey.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'RETIRED'],
        },
      },

      select: {
        keyId: true,
        algorithm: true,
        keyType: true,
        publicKey: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
