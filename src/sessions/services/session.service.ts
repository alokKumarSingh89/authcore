import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { durationToMs } from '../../common/utils/duration.util.js';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}
  async createSession(params: {
    userId: string;
    clientId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const ttl = this.configService.get<string>('session.ttl', '30d');
    const expiresAt = new Date(Date.now() + durationToMs(ttl));
    return this.prisma.session.create({
      data: {
        userId: params.userId,
        clientId: params.clientId,
        deviceId: params.deviceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: 'ACTIVE',
        expiresAt,
      },
    });
  }
}
