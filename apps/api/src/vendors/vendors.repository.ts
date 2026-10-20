import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL, type Db, type DbClient } from '../platform/database.js';
import type { DuplicateMatch } from '../rules/rules.types.js';
import type { ApplicationData } from './application.schema.js';

export type ApplicationStatus =
  | 'email_unconfirmed' | 'submitted' | 'in_review' | 'needs_info' | 'approved' | 'rejected' | 'expired';
export type VendorStatus = 'onboarding' | 'ready' | 'live';
export type SectionStatus = 'not_started' | 'submitted' | 'approved' | 'changes_requested';

export interface ApplicationRow {
  id: string;
  status: ApplicationStatus;
  email: string;
  shop_name: string;
  legal_name: string;
  business_type: ApplicationData['business']['type'];
  country: string;
  vat_id: string | null;
  phone: string | null;
  website: string | null;
  categories: string[];
  data: ApplicationData & { fixture?: string };
  created_at: Date;
  updated_at: Date;
  submitted_at: Date | null;
  decided_at: Date | null;
}

export interface CheckRow {
  kind: 'rules' | 'ai';
  status: 'pending' | 'done' | 'failed';
  result: any;
  error: string | null;
  updated_at: Date;
}

export interface VendorRow {
  id: string;
  application_id: string;
  user_id: string;
  shop_name: string;
  status: VendorStatus;
  stripe_account_id: string | null;
  created_at: Date;
  live_at: Date | null;
}

export interface SectionRow {
  vendor_id: string;
  key: string;
  status: SectionStatus;
  data: Record<string, unknown>;
  admin_note: string | null;
  updated_at: Date;
  reviewed_at: Date | null;
}

export interface EventInput {
  subjectType: 'application' | 'vendor' | 'section';
  subjectId: string;
  from?: string | null;
  to?: string | null;
  actor: string;
  reason?: string | null;
  message?: string | null;
  meta?: Record<string, unknown>;
}

/** The only place that runs SQL against the vendors schema. */
@Injectable()
export class VendorsRepository {
  constructor(@Inject(PG_POOL) readonly db: Db) {}

  // Applications ----------------------------------------------------------

  async insertApplication(data: ApplicationData & { fixture?: string }, client: DbClient = this.db): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `insert into vendors.applications
         (status, email, shop_name, legal_name, business_type, country, vat_id, phone, website, categories, data)
       values ('email_unconfirmed', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id`,
      [
        data.contact.email.toLowerCase(),
        data.business.shopName,
        data.business.legalName,
        data.business.type,
        data.business.country,
        data.business.vatId ? data.business.vatId.toUpperCase().replace(/[\s.\-]/g, '') : null,
        data.contact.phone.replace(/[\s\-()/.]/g, '').replace(/^00/, '+'),
        normalizeWebsite(data.contact.website),
        data.products.categories,
        JSON.stringify(data),
      ],
    );
    return rows[0].id;
  }

  async getApplication(id: string, client: DbClient = this.db): Promise<ApplicationRow | undefined> {
    const { rows } = await client.query<ApplicationRow>('select * from vendors.applications where id = $1', [id]);
    return rows[0];
  }

  async lockApplication(id: string, client: DbClient): Promise<ApplicationRow | undefined> {
    const { rows } = await client.query<ApplicationRow>('select * from vendors.applications where id = $1 for update', [id]);
    return rows[0];
  }

  async setApplicationStatus(id: string, status: ApplicationStatus, client: DbClient = this.db) {
    await client.query(
      `update vendors.applications set status = $2, updated_at = now(),
         submitted_at = case when $2 = 'submitted' then now() else submitted_at end,
         decided_at = case when $2 in ('approved', 'rejected') then now() else decided_at end
       where id = $1`,
      [id, status],
    );
  }

  async listApplications(statuses: ApplicationStatus[]) {
    const { rows } = await this.db.query(
      `select a.id, a.status, a.shop_name, a.legal_name, a.country, a.categories, a.created_at, a.submitted_at, a.decided_at,
              ai.status as ai_status, ai.result -> 'recommendation' as ai_recommendation,
              ai.result -> 'confidence' as ai_confidence,
              coalesce((select count(*) from jsonb_array_elements(r.result) e where e ->> 'outcome' = 'fail'), 0)::int as rule_fails
       from vendors.applications a
       left join vendors.application_checks ai on ai.application_id = a.id and ai.kind = 'ai'
       left join vendors.application_checks r on r.application_id = a.id and r.kind = 'rules'
       where a.status = any($1)
       order by coalesce(a.submitted_at, a.created_at) asc`,
      [statuses],
    );
    return rows;
  }

  async countApplicationsByStatus(): Promise<Record<string, number>> {
    const { rows } = await this.db.query<{ status: string; n: number }>(
      'select status, count(*)::int as n from vendors.applications group by status',
    );
    return Object.fromEntries(rows.map((r) => [r.status, r.n]));
  }

  /** Other applications or vendors that share a contact or business detail with this one. */
  async findDuplicates(app: ApplicationRow): Promise<DuplicateMatch[]> {
    const { rows } = await this.db.query<DuplicateMatch>(
      `select field, "otherId", "otherShopName", "otherStatus" from (
         select 'email' as field, id as "otherId", shop_name as "otherShopName", status as "otherStatus"
           from vendors.applications where id <> $1 and lower(email) = lower($2)
         union all
         select 'vat_id', id, shop_name, status from vendors.applications where id <> $1 and $3::text is not null and vat_id = $3
         union all
         select 'shop_name', id, shop_name, status from vendors.applications where id <> $1 and lower(shop_name) = lower($4)
         union all
         select 'phone', id, shop_name, status from vendors.applications where id <> $1 and $5::text is not null and phone = $5
         union all
         select 'website', id, shop_name, status from vendors.applications where id <> $1 and $6::text is not null and website = $6
       ) d
       where "otherStatus" not in ('expired')`,
      [app.id, app.email, app.vat_id, app.shop_name, app.phone, app.website],
    );
    return rows;
  }

  // Checks ----------------------------------------------------------------

  async saveCheck(applicationId: string, kind: 'rules' | 'ai', status: CheckRow['status'], result: unknown, error: string | null = null) {
    await this.db.query(
      `insert into vendors.application_checks (application_id, kind, status, result, error)
       values ($1, $2, $3, $4, $5)
       on conflict (application_id, kind)
       do update set status = excluded.status, result = excluded.result, error = excluded.error, updated_at = now()`,
      [applicationId, kind, status, result === null ? null : JSON.stringify(result), error],
    );
  }

  async getChecks(applicationId: string): Promise<CheckRow[]> {
    const { rows } = await this.db.query<CheckRow>(
      'select kind, status, result, error, updated_at from vendors.application_checks where application_id = $1',
      [applicationId],
    );
    return rows;
  }

  // Questions -------------------------------------------------------------

  async insertQuestion(applicationId: string, question: string, askedBy: string, client: DbClient): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      'insert into vendors.questions (application_id, question, asked_by) values ($1, $2, $3) returning id',
      [applicationId, question, askedBy],
    );
    return rows[0].id;
  }

  async getQuestion(id: string, client: DbClient = this.db) {
    const { rows } = await client.query<{ id: string; application_id: string; question: string; answer: string | null }>(
      'select id, application_id, question, answer from vendors.questions where id = $1',
      [id],
    );
    return rows[0];
  }

  async answerQuestion(id: string, answer: string, client: DbClient) {
    await client.query('update vendors.questions set answer = $2, answered_at = now() where id = $1', [id, answer]);
  }

  async listQuestions(applicationId: string) {
    const { rows } = await this.db.query(
      'select id, question, answer, asked_at, answered_at from vendors.questions where application_id = $1 order by asked_at',
      [applicationId],
    );
    return rows;
  }

  // Vendors and sections --------------------------------------------------

  async insertVendor(v: { applicationId: string; userId: string; shopName: string }, client: DbClient): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `insert into vendors.vendors (application_id, user_id, shop_name, status) values ($1, $2, $3, 'onboarding') returning id`,
      [v.applicationId, v.userId, v.shopName],
    );
    return rows[0].id;
  }

  async insertSections(vendorId: string, keys: string[], client: DbClient) {
    for (const key of keys) {
      await client.query(`insert into vendors.sections (vendor_id, key, status) values ($1, $2, 'not_started')`, [vendorId, key]);
    }
  }

  async getVendorByUser(userId: string): Promise<VendorRow | undefined> {
    const { rows } = await this.db.query<VendorRow>('select * from vendors.vendors where user_id = $1', [userId]);
    return rows[0];
  }

  async getVendor(id: string, client: DbClient = this.db): Promise<VendorRow | undefined> {
    const { rows } = await client.query<VendorRow>('select * from vendors.vendors where id = $1', [id]);
    return rows[0];
  }

  async getVendorByApplication(applicationId: string): Promise<VendorRow | undefined> {
    const { rows } = await this.db.query<VendorRow>('select * from vendors.vendors where application_id = $1', [applicationId]);
    return rows[0];
  }

  async listVendors() {
    const { rows } = await this.db.query(
      `select v.id, v.shop_name, v.status, v.created_at, v.live_at,
              count(*) filter (where s.status = 'submitted')::int as waiting,
              count(*) filter (where s.status = 'approved')::int as approved,
              count(*)::int as total
       from vendors.vendors v
       left join vendors.sections s on s.vendor_id = v.id
       group by v.id
       order by count(*) filter (where s.status = 'submitted') desc, v.created_at asc`,
    );
    return rows;
  }

  async setVendorStatus(id: string, status: VendorStatus, client: DbClient = this.db) {
    await client.query(
      `update vendors.vendors set status = $2, updated_at = now(),
         live_at = case when $2 = 'live' then now() else live_at end
       where id = $1`,
      [id, status],
    );
  }

  async setStripeAccount(vendorId: string, accountId: string) {
    await this.db.query('update vendors.vendors set stripe_account_id = $2, updated_at = now() where id = $1', [vendorId, accountId]);
  }

  async getSections(vendorId: string, client: DbClient = this.db): Promise<SectionRow[]> {
    const { rows } = await client.query<SectionRow>('select * from vendors.sections where vendor_id = $1', [vendorId]);
    return rows;
  }

  async getSection(vendorId: string, key: string, client: DbClient = this.db): Promise<SectionRow | undefined> {
    const { rows } = await client.query<SectionRow>('select * from vendors.sections where vendor_id = $1 and key = $2', [vendorId, key]);
    return rows[0];
  }

  async updateSection(
    vendorId: string,
    key: string,
    patch: { status: SectionStatus; data?: Record<string, unknown>; adminNote?: string | null; reviewedBy?: string | null },
    client: DbClient = this.db,
  ) {
    await client.query(
      `update vendors.sections set
         status = $3,
         data = coalesce($4::jsonb, data),
         admin_note = case when $5::boolean then $6 else admin_note end,
         reviewed_at = case when $7::uuid is not null then now() else reviewed_at end,
         reviewed_by = coalesce($7::uuid, reviewed_by),
         updated_at = now()
       where vendor_id = $1 and key = $2`,
      [
        vendorId,
        key,
        patch.status,
        patch.data ? JSON.stringify(patch.data) : null,
        patch.adminNote !== undefined,
        patch.adminNote ?? null,
        patch.reviewedBy ?? null,
      ],
    );
  }

  // Audit -----------------------------------------------------------------

  async logEvent(e: EventInput, client: DbClient = this.db) {
    await client.query(
      `insert into vendors.events (subject_type, subject_id, from_status, to_status, actor, reason, message, meta)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [e.subjectType, e.subjectId, e.from ?? null, e.to ?? null, e.actor, e.reason ?? null, e.message ?? null, e.meta ? JSON.stringify(e.meta) : null],
    );
  }

  async listEvents(subjectIds: string[]) {
    const { rows } = await this.db.query(
      `select subject_type, subject_id, from_status, to_status, actor, reason, message, meta, created_at
       from vendors.events where subject_id = any($1::uuid[]) order by created_at, id`,
      [subjectIds],
    );
    return rows;
  }
}

export function normalizeWebsite(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}
