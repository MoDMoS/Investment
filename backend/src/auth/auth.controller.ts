import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const COOKIE = 'access_token';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE, cookieOptions());
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }

  private setCookie(res: Response, token: string) {
    res.cookie(COOKIE, token, {
      ...cookieOptions(),
      maxAge: WEEK_MS,
    });
  }
}

function cookieSecure() {
  const raw = process.env.COOKIE_SECURE;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(),
    path: '/',
  };
}
