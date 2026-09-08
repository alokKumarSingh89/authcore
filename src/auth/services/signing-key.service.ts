import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class SigningKeyService {
  constructor(private readonly prisma: PrismaService) {}
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
