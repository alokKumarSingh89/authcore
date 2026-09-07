export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  port: Number(process.env.PORT ?? 3000),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    issuer: process.env.JWT_ISSUER ?? 'authcore',
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '10m',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '30d',
  },
  authcore: {
    keyEncryptionKey: process.env.AUTHCORE_KEY_ENCRYPTION_KEY,
  },
});
