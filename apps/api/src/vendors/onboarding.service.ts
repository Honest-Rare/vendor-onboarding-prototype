import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../accounts/accounts.service.js';
import { config } from '../config.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { templates } from '../notifications/templates.js';
import { PAYMENTS_PROVIDER, type PaymentsProvider } from '../payments/payments.types.js';
import { SimulatedPaymentsProvider } from '../payments/simulated-payments.provider.js';
import { withTransaction, type DbClient } from '../platform/database.js';
import { FilesService } from '../platform/files.service.js';
import { RulesService } from '../rules/rules.service.js';
import { sectionDef, sectionsFor, visibleFields, type SectionContext, type SectionDef } from './sections.config.js';
import { VendorsRepository, type ApplicationRow, type SectionRow, type VendorRow } from './vendors.repository.js';

const MAX_TEXT = 5000;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly repo: VendorsRepository,
    private readonly rules: RulesService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENTS_PROVIDER) private readonly payments: PaymentsProvider,
    private readonly simulatedPayments: SimulatedPaymentsProvider,
  ) {}

  // Vendor panel --------------------------------------------------------------

  async overview(user: SessionUser) {
    const { vendor, app, ctx } = await this.forUser(user);
    const rows = await this.repo.getSections(vendor.id);
    const defs = sectionsFor(ctx);
    return {
      vendor: { id: vendor.id, shopName: vendor.shop_name, status: vendor.status, liveAt: vendor.live_at },
      contactName: app.data.contact.firstName,
      payoutsSimulated: this.payments.simulated,
      gate: this.rules.gate(this.gateSections(defs, rows)),
      sections: await Promise.all(defs.map((def) => this.describeSection(def, rows, ctx))),
    };
  }

  async saveSection(user: SessionUser, key: string, input: Record<string, unknown>, submit: boolean) {
    const { vendor, ctx } = await this.forUser(user);
    const def = this.applicableDef(key, ctx);
    if (def.reviewer !== 'admin') throw new BadRequestException('This section is completed on Stripe.');

    const data = await this.cleanData(def, ctx, input, vendor.id, submit);
    return withTransaction(this.repo.db, async (client) => {
      const row = await this.repo.getSection(vendor.id, key, client);
      if (!row) throw new NotFoundException();
      if (!submit && row.status === 'approved') {
        throw new ConflictException('This section is approved. Send changes for review to edit it.');
      }
      // Saving a draft keeps the status; sending for review (also after approval) starts a new admin check.
      const status = submit ? 'submitted' : row.status;
      await this.repo.updateSection(vendor.id, key, { status, data }, client);
      if (submit) {
        await this.repo.logEvent(
          { subjectType: 'section', subjectId: vendor.id, from: row.status, to: 'submitted', actor: 'vendor', meta: { key } },
          client,
        );
      }
      await this.updateReadiness(vendor.id, client);
      return { ok: true };
    });
  }

  async upload(user: SessionUser, file: Parameters<FilesService['save']>[0]) {
    const { vendor } = await this.forUser(user);
    return this.files.save(file, 'vendor', vendor.id);
  }

  async startPayouts(user: SessionUser) {
    const { vendor, app } = await this.forUser(user);
    let accountId = vendor.stripe_account_id;
    if (!accountId) {
      accountId = await this.payments.createAccount({
        email: app.email,
        country: app.country,
        businessType: app.business_type === 'company' ? 'company' : 'individual',
      });
      await this.repo.setStripeAccount(vendor.id, accountId);
      await this.repo.logEvent({ subjectType: 'vendor', subjectId: vendor.id, actor: 'system', reason: 'Payout account created', meta: { accountId } });
    }
    const row = await this.repo.getSection(vendor.id, 'payouts');
    if (row?.status === 'not_started') await this.repo.updateSection(vendor.id, 'payouts', { status: 'submitted' });
    const url = await this.payments.createOnboardingLink(accountId, {
      returnUrl: `${config.webBaseUrl}/vendor?payouts=return`,
      refreshUrl: `${config.webBaseUrl}/vendor?payouts=refresh`,
    });
    return { url };
  }

  /** Reads the account state from Stripe and updates the payouts section. Stripe is the reviewer here. */
  async refreshPayouts(user: SessionUser) {
    const { vendor } = await this.forUser(user);
    if (!vendor.stripe_account_id) return { status: 'not_started' };
    const status = await this.payments.getStatus(vendor.stripe_account_id);
    const next = status.payoutsEnabled ? 'approved' : 'submitted';
    await withTransaction(this.repo.db, async (client) => {
      const row = await this.repo.getSection(vendor.id, 'payouts', client);
      if (row && row.status !== next) {
        await this.repo.updateSection(
          vendor.id,
          'payouts',
          { status: next, data: { requirementsDue: status.requirementsDue }, adminNote: null },
          client,
        );
        await this.repo.logEvent(
          { subjectType: 'section', subjectId: vendor.id, from: row.status, to: next, actor: 'stripe', meta: { key: 'payouts' } },
          client,
        );
      }
      await this.updateReadiness(vendor.id, client);
    });
    return { status: next, requirementsDue: status.requirementsDue };
  }

  async completeSimulatedPayouts(user: SessionUser, accountId: string) {
    if (!this.payments.simulated) throw new ForbiddenException('Real Stripe is connected; the simulation is off.');
    const { vendor } = await this.forUser(user);
    if (vendor.stripe_account_id !== accountId) throw new ForbiddenException('This payout account belongs to someone else.');
    await this.simulatedPayments.completeOnboarding(accountId);
    return this.refreshPayouts(user);
  }

  async goLive(user: SessionUser) {
    const { vendor, app } = await this.forUser(user);
    return withTransaction(this.repo.db, async (client) => {
      const current = await this.repo.getVendor(vendor.id, client);
      if (current?.status !== 'ready') throw new ConflictException('Every section must be approved before going live.');
      await this.repo.setVendorStatus(vendor.id, 'live', client);
      await this.repo.logEvent({ subjectType: 'vendor', subjectId: vendor.id, from: 'ready', to: 'live', actor: 'vendor' }, client);
      await this.notifications.send(app.email, templates.live({ name: app.data.contact.firstName, shopName: vendor.shop_name }), client);
      return { ok: true };
    });
  }

  // Admin: final check of each section -------------------------------------------

  async listVendors() {
    return this.repo.listVendors();
  }

  async vendorDetail(vendorId: string) {
    const vendor = await this.repo.getVendor(vendorId);
    if (!vendor) throw new NotFoundException('Vendor not found');
    const app = await this.mustGetApplication(vendor);
    const ctx = this.contextFor(app);
    const rows = await this.repo.getSections(vendor.id);
    const defs = sectionsFor(ctx);
    const sections = await Promise.all(defs.map((def) => this.describeSection(def, rows, ctx)));
    return {
      vendor: {
        id: vendor.id,
        shopName: vendor.shop_name,
        status: vendor.status,
        createdAt: vendor.created_at,
        liveAt: vendor.live_at,
        stripeAccountId: vendor.stripe_account_id,
      },
      application: {
        id: app.id,
        legalName: app.legal_name,
        email: app.email,
        country: app.country,
        categories: app.categories,
        businessType: app.business_type,
      },
      gate: this.rules.gate(this.gateSections(defs, rows)),
      sections,
      events: await this.repo.listEvents([vendor.id]),
    };
  }

  async reviewSection(vendorId: string, key: string, user: SessionUser, decision: 'approve' | 'request_changes', note: string) {
    const vendor = await this.repo.getVendor(vendorId);
    if (!vendor) throw new NotFoundException('Vendor not found');
    const app = await this.mustGetApplication(vendor);
    const def = this.applicableDef(key, this.contextFor(app));
    if (def.reviewer !== 'admin') throw new BadRequestException('Stripe checks this section.');
    if (decision === 'request_changes' && !note) throw new BadRequestException('Tell the vendor what to change.');

    return withTransaction(this.repo.db, async (client) => {
      const row = await this.repo.getSection(vendorId, key, client);
      if (row?.status !== 'submitted') throw new ConflictException('Only sections waiting for review can be checked.');
      const next = decision === 'approve' ? 'approved' : 'changes_requested';
      await this.repo.updateSection(vendorId, key, { status: next, adminNote: note || null, reviewedBy: user.id }, client);
      await this.repo.logEvent(
        { subjectType: 'section', subjectId: vendorId, from: row.status, to: next, actor: `admin:${user.email}`, reason: note || null, meta: { key } },
        client,
      );
      if (next === 'changes_requested') {
        await this.notifications.send(
          app.email,
          templates.sectionChangesRequested({
            name: app.data.contact.firstName,
            section: def.title,
            note,
            link: `${config.webBaseUrl}/vendor/sections/${key}`,
          }),
          client,
        );
      }
      await this.updateReadiness(vendorId, client);
      return { ok: true };
    });
  }

  // Helpers --------------------------------------------------------------------

  /** Moves the vendor between onboarding and ready as the go-live gate opens or closes. */
  private async updateReadiness(vendorId: string, client: DbClient) {
    const vendor = await this.repo.getVendor(vendorId, client);
    if (!vendor || vendor.status === 'live') return;
    const app = await this.repo.getApplication(vendor.application_id, client);
    if (!app) return;
    const gate = this.rules.gate(this.gateSections(sectionsFor(this.contextFor(app)), await this.repo.getSections(vendorId, client)));

    if (gate.ready && vendor.status === 'onboarding') {
      await this.repo.setVendorStatus(vendorId, 'ready', client);
      await this.repo.logEvent({ subjectType: 'vendor', subjectId: vendorId, from: 'onboarding', to: 'ready', actor: 'system', reason: 'All sections approved' }, client);
      await this.notifications.send(app.email, templates.readyToGoLive({ name: app.data.contact.firstName, link: `${config.webBaseUrl}/vendor` }), client);
    } else if (!gate.ready && vendor.status === 'ready') {
      await this.repo.setVendorStatus(vendorId, 'onboarding', client);
      await this.repo.logEvent({ subjectType: 'vendor', subjectId: vendorId, from: 'ready', to: 'onboarding', actor: 'system', reason: 'A section changed' }, client);
    }
  }

  private gateSections(defs: SectionDef[], rows: SectionRow[]) {
    return defs.map((def) => ({ key: def.key, title: def.title, status: rows.find((r) => r.key === def.key)?.status ?? 'not_started' }));
  }

  private async describeSection(def: SectionDef, rows: SectionRow[], ctx: SectionContext) {
    const row = rows.find((r) => r.key === def.key);
    const fields = visibleFields(def, ctx);
    const data = row?.data ?? {};
    const fileIds = fields.filter((f) => f.type === 'document').map((f) => data[f.key]).filter((v): v is string => typeof v === 'string');
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      reviewer: def.reviewer,
      status: row?.status ?? 'not_started',
      adminNote: row?.admin_note ?? null,
      updatedAt: row?.updated_at ?? null,
      reviewedAt: row?.reviewed_at ?? null,
      fields,
      data,
      files: await this.files.getMany(fileIds),
    };
  }

  private async cleanData(def: SectionDef, ctx: SectionContext, input: Record<string, unknown>, vendorId: string, submit: boolean) {
    const fields = visibleFields(def, ctx);
    const data: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const field of fields) {
      const raw = input[field.key];
      let value: unknown;
      if (field.type === 'checkbox') {
        value = raw === true;
      } else if (field.type === 'document') {
        value = typeof raw === 'string' && raw ? raw : null;
        if (value) {
          const file = await this.files.get(value as string).catch(() => undefined);
          if (!file || file.ownerType !== 'vendor' || file.ownerRef !== vendorId) {
            throw new BadRequestException(`The file for "${field.label}" could not be found. Upload it again.`);
          }
        }
      } else if (field.type === 'select') {
        value = field.options?.some((o) => o.value === raw) ? raw : null;
      } else {
        value = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim().slice(0, MAX_TEXT) : '';
      }
      const empty = value === '' || value === null || value === false;
      if (submit && field.required && empty) missing.push(field.label);
      data[field.key] = value;
    }
    if (missing.length > 0) {
      throw new BadRequestException({ message: 'Some required fields are empty', errors: missing.map((m) => ({ path: m, message: `${m} is required` })) });
    }
    return data;
  }

  private applicableDef(key: string, ctx: SectionContext): SectionDef {
    const def = sectionDef(key);
    if (!def || !def.appliesTo(ctx)) throw new NotFoundException('Section not found');
    return def;
  }

  private async forUser(user: SessionUser): Promise<{ vendor: VendorRow; app: ApplicationRow; ctx: SectionContext }> {
    const vendor = await this.repo.getVendorByUser(user.id);
    if (!vendor) throw new NotFoundException('No vendor account found for this user');
    const app = await this.mustGetApplication(vendor);
    return { vendor, app, ctx: this.contextFor(app) };
  }

  private async mustGetApplication(vendor: VendorRow): Promise<ApplicationRow> {
    const app = await this.repo.getApplication(vendor.application_id);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  private contextFor(app: ApplicationRow): SectionContext {
    return { categories: app.categories, ...this.rules.categoryFlags(app.categories), businessType: app.business_type };
  }
}
