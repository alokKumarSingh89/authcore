import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { Request } from 'express';
import { JwtPayload } from '../tokens/interfaces/jwt-payload.interface.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Req()
    request: Request & {
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        status: string;
      };
    },
  ) {
    return this.authService.login({
      user: request.user,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @Req()
    request: Request & {
      user: JwtPayload;
    },
  ) {
    return {
      user: request.user,
    };
  }
}
