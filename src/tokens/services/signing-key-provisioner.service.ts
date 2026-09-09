import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { KeyEncryptionService } from './key-encryption.service.js';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

@Injectable()
export class SigningKeyProvisionerService {
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

    /*
     * The transaction + application-level
     * operational control prevents normal
     * application replicas from provisioning keys.
     */
    return this.prisma.$transaction(async (tx) => {
      const activeKey = await tx.signingKey.findFirst({
        where: {
          status: 'ACTIVE',
        },
      });
      if (activeKey) {
        return activeKey;
      }
      return tx.signingKey.create({
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
    });
  }
}
