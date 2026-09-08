import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtKeyService } from '../../tokens/services/jwt-key.service.js';
import { JwtPayload } from '../../tokens/interfaces/jwt-payload.interface.js';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtKeyService: JwtKeyService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      algorithms: ['RS256'],
      issuer: configService.getOrThrow<string>('jwt.issuer'),
      secretOrKeyProvider: async (
        _request: any,
        rawJwtToken: string,
        done: (error: any, secret?: string | Buffer) => void,
      ) => {
        void this.resolvePublicKey(rawJwtToken, done);
      },
    });
  }
  private async resolvePublicKey(
    rawJwtToken: string,
    done: (error: any, secret?: string | Buffer) => void,
  ) {
    try {
      const decoded = this.decodeToken(rawJwtToken);

      if (!decoded || typeof decoded !== 'object') {
        return done(new UnauthorizedException('Invalid JWT'));
      }

      const keyId = decoded.header?.kid;

      if (typeof keyId !== 'string' || !keyId) {
        return done(new UnauthorizedException('JWT key identifier is missing'));
      }

      const publicKey = await this.jwtKeyService.getPublicKey(keyId);

      done(null, publicKey);
    } catch (error) {
      done(error);
    }
  }
  validate(payload: JwtPayload) {
    return payload;
  }
  private decodeToken(token: string): any {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }
    try {
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      );
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      );
      return {
        header,
        payload,
      };
    } catch {
      return null;
    }
  }
}
