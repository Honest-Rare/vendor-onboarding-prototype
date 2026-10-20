import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { parse } from '../common/validation.js';
import { AccountsService } from './accounts.service.js';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from './session.js';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'vendor']),
});

const setPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(10, 'Use at least 10 characters').max(200),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly accounts: AccountsService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = parse(loginSchema, body);
    setSessionCookie(res, await this.accounts.login(input.email, input.password, input.role));
    return { ok: true };
  }

  @Post('set-password')
  @HttpCode(200)
  async setPassword(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = parse(setPasswordSchema, body);
    setSessionCookie(res, await this.accounts.setPasswordWithToken(input.token, input.password));
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.accounts.logout(readSessionCookie(req));
    clearSessionCookie(res);
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const user = await this.accounts.userForSession(readSessionCookie(req));
    if (!user) throw new UnauthorizedException('Not signed in');
    return user;
  }
}
