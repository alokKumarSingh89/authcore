export interface JwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];

  sid: string;

  jti: string;

  client_id?: string;

  scope?: string;

  iat: number;
  exp: number;
}
