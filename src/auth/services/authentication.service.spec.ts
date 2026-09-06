import { UnauthorizedException } from '@nestjs/common';
import { AuthenticationService } from './authentication.service.js';

describe('AuthenticationService', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
  };
  const passwordService = {
    verify: vi.fn(),
  };

  let service: AuthenticationService;
  beforeEach(() => {
    vi.clearAllMocks();

    service = new AuthenticationService(prisma as any, passwordService as any);
  });
  it('should authenticate a valid user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      credential: {
        passwordHash: 'hashed-password',
      },
    });
    passwordService.verify.mockResolvedValue(true);
    const result = await service.validateUser(
      'TEST@EXAMPLE.COM',
      'password123',
    );
    expect(result).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
    });
    expect(passwordService.verify).toHaveBeenCalledWith(
      'hashed-password',
      'password123',
    );
  });
  it('should reject an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.validateUser('unknown@example.com', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('should reject an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'PENDING_VERIFICATION',
      credential: {
        passwordHash: 'hashed-password',
      },
    });

    await expect(
      service.validateUser('test@example.com', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(passwordService.verify).not.toHaveBeenCalled();
  });

  it('should reject an invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      credential: {
        passwordHash: 'hashed-password',
      },
    });

    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.validateUser('test@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject a user without credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      credential: null,
    });

    await expect(
      service.validateUser('test@example.com', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
