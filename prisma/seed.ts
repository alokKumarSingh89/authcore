import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import {
  generateKeyPairSync,
  randomUUID,
  createCipheriv,
  randomBytes,
} from 'node:crypto';

import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const encryptionKey = process.env.AUTHCORE_KEY_ENCRYPTION_KEY;

if (!encryptionKey) {
  throw new Error('AUTHCORE_KEY_ENCRYPTION_KEY is not configured');
}

if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  throw new Error(
    'AUTHCORE_KEY_ENCRYPTION_KEY must be a 64-character hexadecimal string',
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

function encryptPrivateKey(privateKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex');
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

function generateSigningKey() {
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

  return {
    keyId: `authcore-${randomUUID()}`,
    algorithm: 'RS256',
    keyType: 'RSA',
    publicKey,
    privateKey,
  };
}

async function seedRoles() {
  await prisma.role.upsert({
    where: {
      name: 'USER',
    },
    update: {},
    create: {
      name: 'USER',
      description: 'Default authenticated user',
      system: true,
    },
  });

  await prisma.role.upsert({
    where: {
      name: 'ADMIN',
    },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrator',
      system: true,
    },
  });

  console.log('✓ Roles seeded');
}

async function seedSigningKey() {
  const existingKey = await prisma.signingKey.findFirst({
    where: {
      status: 'ACTIVE',
    },
  });

  if (existingKey) {
    console.log(`✓ Active signing key already exists: ${existingKey.keyId}`);
    return;
  }

  const signingKey = generateSigningKey();

  const privateKeyEncrypted = encryptPrivateKey(signingKey.privateKey);

  const createdKey = await prisma.signingKey.create({
    data: {
      keyId: signingKey.keyId,
      algorithm: signingKey.algorithm,
      keyType: signingKey.keyType,
      publicKey: signingKey.publicKey,
      privateKeyEncrypted,
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });

  console.log(`✓ Signing key created: ${createdKey.keyId}`);
}

async function main() {
  console.log('Starting AuthCore seed...');

  await seedRoles();

  await seedSigningKey();

  console.log('AuthCore seed completed');
}

main()
  .catch((error) => {
    console.error('AuthCore seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
