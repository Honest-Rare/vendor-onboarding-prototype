import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { AccountsService, type SessionUser } from './accounts.service.js';

export const SESSION_COOKIE = 'hr_session';

export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.webBaseUrl.startsWith('https://'),
    path: '/',
    maxAge: config.sessionTtlHours * 3600 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

abstract class RoleGuard implements CanActivate {
  protected abstract readonly role: SessionUser['role'];
  constructor(protected readonly accounts: AccountsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const user = await this.accounts.userForSession(readSessionCookie(req));
    if (!user) throw new UnauthorizedException('Please sign in');
    if (user.role !== this.role) throw new ForbiddenException('Not allowed');
    req.user = user;
    return true;
  }
}

@Injectable()
export class AdminGuard extends RoleGuard {
  protected readonly role = 'admin' as const;
  constructor(accounts: AccountsService) {
    super(accounts);
  }
}

@Injectable()
export class VendorGuard extends RoleGuard {
  protected readonly role = 'vendor' as const;
  constructor(accounts: AccountsService) {
    super(accounts);
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): SessionUser => {
  return context.switchToHttp().getRequest<Request & { user: SessionUser }>().user;
});
