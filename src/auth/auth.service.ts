import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { PasswordService } from './services/password.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { DEFAULT_USER_ROLE } from './constants/auth.constants.js';
import { AuthenticationService } from './services/authentication.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly authenticationService: AuthenticationService,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'Unable to create account with the provided information',
      );
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Unable to create account with the provided information',
        );
      }
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          firstName: this.normalizeName(dto.firstName),
          lastName: this.normalizeName(dto.lastName),
          status: 'PENDING_VERIFICATION',
        },
      });
      await tx.credential.create({
        data: {
          userId: user.id,
          passwordHash,
          passwordChangedAt: new Date(),
        },
      });
      const role = await tx.role.findUnique({
        where: {
          name: DEFAULT_USER_ROLE,
        },
        select: {
          id: true,
        },
      });

      if (!role) {
        throw new Error(
          `Required system role "${DEFAULT_USER_ROLE}" does not exist`,
        );
      }

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
      await tx.securityEvent.create({
        data: {
          type: 'USER_REGISTERED',
          userId: user.id,
          metadata: {
            reason: 'ACCOUNT_REGISTERED',
          },
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'USER_REGISTERED',
          userId: user.id,
          resourceType: 'User',
          resourceId: user.id,
        },
      });
      await tx.outboxEvent.create({
        data: {
          eventType: 'UserRegistered',
          aggregateType: 'User',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.email,
          },
        },
      });
      return user;
    });
    return {
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  async validateUser(email: string, password: string) {
    return this.authenticationService.validateUser(email, password);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) {
      return undefined;
    }
    const normalized = phone.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeName(name?: string): string | undefined {
    if (!name) {
      return undefined;
    }

    const normalized = name.trim();

    return normalized.length > 0 ? normalized : undefined;
  }
}
