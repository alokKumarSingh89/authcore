import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SigningKeyService } from './signing-key.service.js';
import { publicKeyToJwk, RsaJwk } from '../utils/rsa-jwk.util.js';

@Injectable()
export class JwksService {
  constructor(private readonly signingKeyService: SigningKeyService) {}
  async getJwks(): Promise<{ keys: RsaJwk[] }> {
    const signingKeys = await this.signingKeyService.getPublicKeys();
    try {
      const keys = signingKeys.map((key) =>
        publicKeyToJwk(key.publicKey, key.keyId),
      );
      return {
        keys,
      };
    } catch {
      throw new InternalServerErrorException('Unable to construct JWKS');
    }
  }
}
