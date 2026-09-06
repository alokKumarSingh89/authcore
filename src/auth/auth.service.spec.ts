import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;

  const passwordService = {
    hash: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new AuthService(prisma, passwordService);
  });
  it('should reject an existing email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'existing-user',
    });

    await expect(
      service.register({
        email: 'test@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
    expect(passwordService.hash).not.toHaveBeenCalled();
  });
  it('should normalize email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        user: {
          create: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            firstName: null,
            lastName: null,
            status: 'PENDING_VERIFICATION',
            createdAt: new Date(),
          }),
        },

        credential: {
          create: vi.fn(),
        },

        role: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'role-user',
          }),
        },

        userRole: {
          create: vi.fn(),
        },

        securityEvent: {
          create: vi.fn(),
        },

        auditLog: {
          create: vi.fn(),
        },

        outboxEvent: {
          create: vi.fn(),
        },
      }),
    );
    passwordService.hash.mockResolvedValue('hashed-password');
    await service.register({
      email: '  TEST@Example.COM ',
      password: 'Password123!',
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'test@example.com',
      },
      select: {
        id: true,
      },
    });
  });
});
