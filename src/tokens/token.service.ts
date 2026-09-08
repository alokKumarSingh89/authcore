import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SigningKeyService } from './services/signing-key.service.js';
import type { StringValue } from 'ms';
import { randomUUID } from 'node:crypto';

export interface CreateAccessTokenParams {
  userId: string;
  sessionId: string;
  clientId?: string;
  audience: string;
  scope?: string[];
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly signingKeyService: SigningKeyService,
  ) {}

  async createAccessToken(params: CreateAccessTokenParams): Promise<string> {
    const signingKey = await this.signingKeyService.getPrivateKey();
    const issuer = this.configService.getOrThrow<string>('jwt.issuer');
    const expiresIn = this.configService.get<StringValue>(
      'jwt.accessTokenTtl',
      '10m',
    );
    const jti = randomUUID();
    return this.jwtService.signAsync(
      {
        sub: params.userId,
        sid: params.sessionId,
        client_id: params.clientId,
        scope: params.scope?.join(' '),
      },
      {
        algorithm: 'RS256',
        issuer,
        audience: params.audience,
        expiresIn,
        keyid: signingKey.keyId,
        jwtid: jti,
        privateKey: signingKey.privateKey,
      },
    );
  }
}
