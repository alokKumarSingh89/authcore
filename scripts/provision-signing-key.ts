import 'dotenv/config';

import {
  createCipheriv,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
} from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function encryptPrivateKey(
  privateKey: string,
  encryptionKeyHex: string,
): string {
  const key = Buffer.from(encryptionKeyHex, 'hex');

  if (key.length !== 32) {
    throw new Error('AUTHCORE_KEY_ENCRYPTION_KEY must be exactly 32 bytes');
  }

  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKey, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

async function main() {
  console.log('Starting AuthCore signing-key provisioning...');

  const databaseUrl = getRequiredEnv('DATABASE_URL');
  const encryptionKey = getRequiredEnv('AUTHCORE_KEY_ENCRYPTION_KEY');

  console.log('DATABASE_URL:', databaseUrl);

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    const existingKey = await prisma.signingKey.findFirst({
      where: {
        status: 'ACTIVE',
      },
    });

    if (existingKey) {
      console.log(`Active signing key already exists: ${existingKey.keyId}`);

      return;
    }

    console.log('Generating RSA-2048 signing key...');

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

    const privateKeyEncrypted = encryptPrivateKey(privateKey, encryptionKey);

    const signingKey = await prisma.$transaction(async (tx) => {
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

    console.log('Signing key ready!');
    console.log(`Key ID: ${signingKey.keyId}`);
    console.log(`Algorithm: ${signingKey.algorithm}`);
    console.log(`Key Type: ${signingKey.keyType}`);
    console.log(`Status: ${signingKey.status}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Signing key provisioning failed:');
  console.error(error);
  process.exit(1);
});
