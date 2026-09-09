import { PasswordService } from '../../src/auth/services/password.service.js';
import { PrismaService } from '../../src/database/prisma.service.js';

export async function createActiveTestUser(
  prisma: PrismaService,
  passwordService: PasswordService,
  email: string,
) {
  const password = 'Password123!';

  const passwordHash = await passwordService.hash(password);
  const role = await prisma.role.findUnique({
    where: {
      name: 'USER',
    },
  });
  if (!role) {
    throw new Error('USER role is not seeded');
  }
  const user = await prisma.user.create({
    data: {
      email,
      status: 'ACTIVE',
      firstName: 'Test',
      lastName: 'User',
      emailVerifiedAt: new Date(),
      credential: {
        create: {
          passwordHash,
        },
      },
      roles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });
  return {
    user,
    password,
  };
}
