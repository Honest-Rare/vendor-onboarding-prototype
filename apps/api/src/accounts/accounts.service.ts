import { Injectable, UnauthorizedException } from '@nestjs/common';
import { config } from '../config.js';
import type { DbClient } from '../platform/database.js';
import { AccountsRepository, type Role, type TokenPurpose } from './accounts.repository.js';
import { hashPassword, hashToken, newToken, verifyPassword } from './crypto.js';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

@Injectable()
export class AccountsService {
  constructor(private readonly repo: AccountsRepository) {}

  /** Creates the vendor's login at approval. No password yet: they set one through a link. */
  async createVendorUser(email: string, name: string, client?: DbClient): Promise<string> {
    return this.repo.insertUser({ email, name, role: 'vendor', passwordHash: null }, client);
  }

  async emailInUse(email: string): Promise<boolean> {
    return Boolean(await this.repo.findUserByEmail(email));
  }

  async issueToken(purpose: TokenPurpose, subjectId: string, client?: DbClient): Promise<string> {
    const token = newToken();
    await this.repo.insertToken(token.hash, purpose, subjectId, config.tokenTtlHours[purpose], client);
    return token.raw;
  }

  consumeToken(raw: string, purpose: TokenPurpose, client?: DbClient) {
    return this.repo.consumeToken(hashToken(raw), purpose, client);
  }

  peekToken(raw: string, purpose: TokenPurpose) {
    return this.repo.peekToken(hashToken(raw), purpose);
  }

  async setPasswordWithToken(rawToken: string, password: string): Promise<string> {
    const userId = await this.consumeToken(rawToken, 'set_password');
    if (!userId) throw new UnauthorizedException('This link is invalid or has expired. Ask us for a new one.');
    await this.repo.setPasswordHash(userId, await hashPassword(password));
    return this.createSession(userId);
  }

  async login(email: string, password: string, role: Role): Promise<string> {
    const user = await this.repo.findUserByEmail(email);
    if (!user || user.role !== role || !(await verifyPassword(password, user.password_hash))) {
      throw new UnauthorizedException('Email or password is wrong');
    }
    return this.createSession(user.id);
  }

  async createSession(userId: string): Promise<string> {
    const token = newToken();
    await this.repo.insertSession(token.hash, userId, config.sessionTtlHours);
    return token.raw;
  }

  async userForSession(raw: string | undefined): Promise<SessionUser | undefined> {
    if (!raw) return undefined;
    const user = await this.repo.findSessionUser(hashToken(raw));
    return user && { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async logout(raw: string | undefined) {
    if (raw) await this.repo.deleteSession(hashToken(raw));
  }

  /** Used by the seed script and at startup. */
  async ensureAdmin(email: string, password: string) {
    const existing = await this.repo.findUserByEmail(email);
    if (existing) return existing.id;
    return this.repo.insertUser({ email, name: 'Admin', role: 'admin', passwordHash: await hashPassword(password) });
  }
}
