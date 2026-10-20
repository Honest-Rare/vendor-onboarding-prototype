import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL, type Db, type DbClient } from '../platform/database.js';

export type Role = 'admin' | 'vendor';
export type TokenPurpose = 'confirm_email' | 'answer_question' | 'set_password';

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  password_hash: string | null;
}

/** The only place that runs SQL against the identity schema. */
@Injectable()
export class AccountsRepository {
  constructor(@Inject(PG_POOL) private readonly db: Db) {}

  async findUserByEmail(email: string): Promise<UserRow | undefined> {
    const { rows } = await this.db.query<UserRow>('select * from identity.users where lower(email) = lower($1)', [email]);
    return rows[0];
  }

  async findUserById(id: string): Promise<UserRow | undefined> {
    const { rows } = await this.db.query<UserRow>('select * from identity.users where id = $1', [id]);
    return rows[0];
  }

  async insertUser(user: { email: string; name: string | null; role: Role; passwordHash: string | null }, client: DbClient = this.db) {
    const { rows } = await client.query<{ id: string }>(
      `insert into identity.users (email, name, role, password_hash) values ($1, $2, $3, $4) returning id`,
      [user.email, user.name, user.role, user.passwordHash],
    );
    return rows[0].id;
  }

  async setPasswordHash(userId: string, passwordHash: string) {
    await this.db.query('update identity.users set password_hash = $2 where id = $1', [userId, passwordHash]);
  }

  async insertSession(tokenHash: string, userId: string, ttlHours: number) {
    await this.db.query(
      `insert into identity.sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' hours')::interval)`,
      [tokenHash, userId, String(ttlHours)],
    );
  }

  async findSessionUser(tokenHash: string): Promise<UserRow | undefined> {
    const { rows } = await this.db.query<UserRow>(
      `select u.* from identity.sessions s join identity.users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now()`,
      [tokenHash],
    );
    return rows[0];
  }

  async deleteSession(tokenHash: string) {
    await this.db.query('delete from identity.sessions where token_hash = $1', [tokenHash]);
  }

  async insertToken(tokenHash: string, purpose: TokenPurpose, subjectId: string, ttlHours: number, client: DbClient = this.db) {
    await client.query(
      `insert into identity.one_time_tokens (token_hash, purpose, subject_id, expires_at)
       values ($1, $2, $3, now() + ($4 || ' hours')::interval)`,
      [tokenHash, purpose, subjectId, String(ttlHours)],
    );
  }

  /** Marks the token used and returns its subject, or undefined if missing, used or expired. */
  async consumeToken(tokenHash: string, purpose: TokenPurpose, client: DbClient = this.db): Promise<string | undefined> {
    const { rows } = await client.query<{ subject_id: string }>(
      `update identity.one_time_tokens set used_at = now()
       where token_hash = $1 and purpose = $2 and used_at is null and expires_at > now()
       returning subject_id`,
      [tokenHash, purpose],
    );
    return rows[0]?.subject_id;
  }

  /** Reads a token without using it up (to show a page before the form is sent). */
  async peekToken(tokenHash: string, purpose: TokenPurpose): Promise<string | undefined> {
    const { rows } = await this.db.query<{ subject_id: string }>(
      `select subject_id from identity.one_time_tokens
       where token_hash = $1 and purpose = $2 and used_at is null and expires_at > now()`,
      [tokenHash, purpose],
    );
    return rows[0]?.subject_id;
  }
}
