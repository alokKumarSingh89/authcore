import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SigningKeyService } from './signing-key.service.js';

@Injectable()
export class JwtKeyService {
  constructor(private readonly signingKeyService: SigningKeyService) {}
  async getPublicKey(keyId: string): Promise<string> {
    const signingKey = await this.signingKeyService.getPublicKeyByKeyId(keyId);
    if (!signingKey) {
      throw new UnauthorizedException('Unknown signing key');
    }
    if (signingKey.algorithm !== 'RS256') {
      throw new UnauthorizedException('Unsupported signing algorithm');
    }
    if (signingKey.keyType !== 'RSA') {
      throw new UnauthorizedException('Unsupported signing key type');
    }

    return signingKey.publicKey;
  }
}
