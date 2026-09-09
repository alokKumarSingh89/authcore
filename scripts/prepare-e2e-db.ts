import { execSync } from 'node:child_process';
import { config } from 'dotenv';

// Load test environment before running Prisma commands.
config({
  path: '.env.test',
  override: true,
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not configured in .env.test');
  process.exit(1);
}

// Safety check: never allow this script to reset the main database.
if (!databaseUrl.includes('authcore_test')) {
  console.error(
    '❌ Refusing to reset database because DATABASE_URL does not point to authcore_test.',
  );
  console.error(`Current DATABASE_URL: ${databaseUrl}`);
  process.exit(1);
}

console.log('🧪 Preparing E2E database...');
console.log(`📦 DATABASE_URL: ${databaseUrl}`);

function run(command: string) {
  console.log(`\n▶ ${command}`);

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

try {
  // 1. Reset the test database.
  //
  // This:
  // - drops existing tables/data
  // - recreates the database schema
  // - applies all migrations
  //
  // Prisma 7 does NOT automatically run seed after reset.
  run('npx prisma migrate reset --force ');

  // 2. Explicitly run Prisma seed.
  //
  // Your seed should create:
  // - USER role
  // - ADMIN role
  // - initial SigningKey
  run('npx prisma db seed');

  console.log('\n✅ E2E database is ready.');
} catch (error) {
  console.error('\n❌ Failed to prepare E2E database.');
  process.exit(1);
}
