import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class SecurityEventService {
  constructor(private readonly prisma: PrismaService) {}
  async record(params: {
    type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'LOGOUT_ALL';

    userId?: string;
    clientId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.securityEvent.create({
      data: {
        type: params.type,
        userId: params.userId,
        clientId: params.clientId,
        metadata: params.metadata,
      },
    });
  }
}
