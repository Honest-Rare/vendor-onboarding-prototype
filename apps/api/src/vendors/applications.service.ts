import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service.js';
import type { SessionUser } from '../accounts/accounts.service.js';
import { ScreeningService } from '../ai/ai.module.js';
import { config } from '../config.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { templates } from '../notifications/templates.js';
import { withTransaction } from '../platform/database.js';
import { FilesService } from '../platform/files.service.js';
import { JobsService } from '../platform/jobs.service.js';
import { RulesService } from '../rules/rules.service.js';
import type { ApplicationData } from './application.schema.js';
import { sectionsFor } from './sections.config.js';
import { VendorsRepository, type ApplicationRow, type ApplicationStatus } from './vendors.repository.js';

/** Allowed status changes for applications (PRD, "Statuses"). */
const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  email_unconfirmed: ['submitted', 'expired'],
  submitted: ['in_review'],
  in_review: ['approved', 'needs_info', 'rejected'],
  needs_info: ['in_review', 'expired'],
  approved: [],
  rejected: [],
  expired: [],
};

function assertTransition(from: ApplicationStatus, to: ApplicationStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ConflictException(`An application that is "${from.replace('_', ' ')}" cannot become "${to.replace('_', ' ')}".`);
  }
}

const admin = (user: SessionUser) => `admin:${user.email}`;

@Injectable()
export class ApplicationsService implements OnModuleInit {
  private readonly logger = new Logger('Applications');

  constructor(
    private readonly repo: VendorsRepository,
    private readonly accounts: AccountsService,
    private readonly notifications: NotificationsService,
    private readonly jobs: JobsService,
    private readonly files: FilesService,
    private readonly rules: RulesService,
    private readonly screening: ScreeningService,
  ) {}

  onModuleInit() {
    this.jobs.register('screen_application', (payload: { applicationId: string }) => this.runScreening(payload.applicationId));
  }

  // Applicant ---------------------------------------------------------------

  async submit(data: ApplicationData): Promise<{ id: string }> {
    const photos = await this.files.getMany(data.products.photoIds);
    if (photos.length !== data.products.photoIds.length) throw new BadRequestException('Some photos could not be found. Upload them again.');

    return withTransaction(this.repo.db, async (client) => {
      const id = await this.repo.insertApplication(data, client);
      await this.files.assignOwner(data.products.photoIds, id, client);
      await this.repo.logEvent({ subjectType: 'application', subjectId: id, to: 'email_unconfirmed', actor: 'applicant' }, client);
      const token = await this.accounts.issueToken('confirm_email', id, client);
      await this.notifications.send(
        data.contact.email,
        templates.confirmEmail({ name: data.contact.firstName, link: `${config.webBaseUrl}/apply/confirm?token=${token}` }),
        client,
      );
      return { id };
    });
  }

  async confirmEmail(token: string): Promise<{ shopName: string }> {
    return withTransaction(this.repo.db, async (client) => {
      const id = await this.accounts.consumeToken(token, 'confirm_email', client);
      if (!id) throw new UnauthorizedException('This link is invalid, already used or expired.');
      const app = await this.repo.lockApplication(id, client);
      if (!app) throw new NotFoundException();
      assertTransition(app.status, 'submitted');

      await this.repo.setApplicationStatus(id, 'submitted', client);
      await this.repo.logEvent({ subjectType: 'application', subjectId: id, from: app.status, to: 'submitted', actor: 'applicant' }, client);
      await this.jobs.enqueue('screen_application', { applicationId: id }, client);
      await this.notifications.send(
        app.email,
        templates.applicationReceived({ name: app.data.contact.firstName, shopName: app.shop_name }),
        client,
      );
      await this.notifications.sendToAdmins(
        templates.adminNewApplication({ shopName: app.shop_name, link: `${config.webBaseUrl}/admin/applications/${id}` }),
        client,
      );
      return { shopName: app.shop_name };
    });
  }

  async questionForToken(token: string) {
    const questionId = await this.accounts.peekToken(token, 'answer_question');
    if (!questionId) throw new UnauthorizedException('This link is invalid, already used or expired.');
    const question = await this.repo.getQuestion(questionId);
    const app = question && (await this.repo.getApplication(question.application_id));
    if (!question || !app) throw new NotFoundException();
    return { shopName: app.shop_name, question: question.question };
  }

  async answer(token: string, answer: string) {
    return withTransaction(this.repo.db, async (client) => {
      const questionId = await this.accounts.consumeToken(token, 'answer_question', client);
      if (!questionId) throw new UnauthorizedException('This link is invalid, already used or expired.');
      const question = await this.repo.getQuestion(questionId, client);
      const app = question && (await this.repo.lockApplication(question.application_id, client));
      if (!question || !app) throw new NotFoundException();
      assertTransition(app.status, 'in_review');

      await this.repo.answerQuestion(questionId, answer, client);
      await this.repo.setApplicationStatus(app.id, 'in_review', client);
      await this.repo.logEvent(
        { subjectType: 'application', subjectId: app.id, from: app.status, to: 'in_review', actor: 'applicant', message: answer },
        client,
      );
      await this.notifications.sendToAdmins(
        templates.adminAnswerReceived({ shopName: app.shop_name, link: `${config.webBaseUrl}/admin/applications/${app.id}` }),
        client,
      );
      return { ok: true };
    });
  }

  // Screening (background job) ---------------------------------------------

  /** Rules first, then AI. Either can fail without blocking the admin. */
  async runScreening(applicationId: string) {
    const app = await this.repo.getApplication(applicationId);
    if (!app) return;

    await this.repo.saveCheck(applicationId, 'rules', 'pending', null);
    await this.repo.saveCheck(applicationId, 'ai', 'pending', null);

    try {
      const results = await this.rules.checkApplication({
        businessType: app.business_type,
        legalName: app.legal_name,
        country: app.country,
        vatId: app.data.business.vatId,
        taxNumber: app.data.business.taxNumber,
        registerNumber: app.data.business.registerNumber,
        email: app.email,
        phone: app.data.contact.phone,
        website: app.data.contact.website,
        address: app.data.business.address,
        categories: app.categories,
        photoCount: app.data.products.photoIds.length,
        duplicates: await this.repo.findDuplicates(app),
        fixture: app.data.fixture,
      });
      await this.repo.saveCheck(applicationId, 'rules', 'done', results);
    } catch (error) {
      this.logger.error(error);
      await this.repo.saveCheck(applicationId, 'rules', 'failed', null, errorMessage(error));
    }

    try {
      const result = await this.screening.screen({
        applicationId,
        fixture: app.data.fixture,
        shopName: app.shop_name,
        legalName: app.legal_name,
        country: app.country,
        categories: app.categories,
        makesOwnProducts: app.data.products.makesOwnProducts,
        story: app.data.products.story,
        website: app.data.contact.website,
        socialLinks: app.data.contact.socialLinks,
        whereSoldToday: app.data.products.whereSoldToday,
        productCount: app.data.products.productCount,
        priceRange: app.data.products.priceRange,
        photoCount: app.data.products.photoIds.length,
      });
      await this.repo.saveCheck(applicationId, 'ai', 'done', result);
    } catch (error) {
      this.logger.error(error);
      await this.repo.saveCheck(applicationId, 'ai', 'failed', null, errorMessage(error));
    }

    await withTransaction(this.repo.db, async (client) => {
      const current = await this.repo.lockApplication(applicationId, client);
      if (current?.status === 'submitted') {
        await this.repo.setApplicationStatus(applicationId, 'in_review', client);
        await this.repo.logEvent(
          { subjectType: 'application', subjectId: applicationId, from: 'submitted', to: 'in_review', actor: 'system', reason: 'Checks finished' },
          client,
        );
      }
    });
  }

  async rerunScreening(id: string, user: SessionUser) {
    const app = await this.mustGet(id);
    if (!['submitted', 'in_review', 'needs_info'].includes(app.status)) {
      throw new ConflictException('Checks can only be rerun while the application is open.');
    }
    await this.jobs.enqueue('screen_application', { applicationId: id });
    await this.repo.logEvent({ subjectType: 'application', subjectId: id, actor: admin(user), reason: 'Reran checks' });
    return { ok: true };
  }

  // Admin ---------------------------------------------------------------------

  async queue(filter: 'open' | 'decided' | 'all') {
    const statuses: ApplicationStatus[] =
      filter === 'open'
        ? ['submitted', 'in_review', 'needs_info']
        : filter === 'decided'
          ? ['approved', 'rejected']
          : ['email_unconfirmed', 'submitted', 'in_review', 'needs_info', 'approved', 'rejected', 'expired'];
    return { items: await this.repo.listApplications(statuses), counts: await this.repo.countApplicationsByStatus() };
  }

  async detail(id: string) {
    const app = await this.mustGet(id);
    const vendor = await this.repo.getVendorByApplication(id);
    const checks = await this.repo.getChecks(id);
    return {
      id: app.id,
      status: app.status,
      createdAt: app.created_at,
      submittedAt: app.submitted_at,
      decidedAt: app.decided_at,
      data: app.data,
      photos: await this.files.getMany(app.data.products.photoIds),
      rules: checks.find((c) => c.kind === 'rules') ?? null,
      ai: checks.find((c) => c.kind === 'ai') ?? null,
      questions: await this.repo.listQuestions(id),
      events: await this.repo.listEvents([id]),
      vendorId: vendor?.id ?? null,
    };
  }

  async approve(id: string, user: SessionUser, reason: string) {
    return withTransaction(this.repo.db, async (client) => {
      const app = await this.repo.lockApplication(id, client);
      if (!app) throw new NotFoundException();
      assertTransition(app.status, 'approved');
      if (await this.accounts.emailInUse(app.email)) {
        throw new ConflictException('A user with this email already exists. Resolve the duplicate before approving.');
      }

      const name = `${app.data.contact.firstName} ${app.data.contact.lastName}`;
      const userId = await this.accounts.createVendorUser(app.email, name, client);
      const vendorId = await this.repo.insertVendor({ applicationId: id, userId, shopName: app.shop_name }, client);
      const flags = this.rules.categoryFlags(app.categories);
      const sections = sectionsFor({ categories: app.categories, ...flags, businessType: app.business_type });
      await this.repo.insertSections(vendorId, sections.map((s) => s.key), client);

      await this.repo.setApplicationStatus(id, 'approved', client);
      await this.repo.logEvent({ subjectType: 'application', subjectId: id, from: app.status, to: 'approved', actor: admin(user), reason }, client);
      await this.repo.logEvent({ subjectType: 'vendor', subjectId: vendorId, to: 'onboarding', actor: admin(user) }, client);

      const token = await this.accounts.issueToken('set_password', userId, client);
      await this.notifications.send(
        app.email,
        templates.approved({ name: app.data.contact.firstName, shopName: app.shop_name, link: `${config.webBaseUrl}/vendor/set-password?token=${token}` }),
        client,
      );
      return { vendorId };
    });
  }

  async reject(id: string, user: SessionUser, reason: string, message: string) {
    return withTransaction(this.repo.db, async (client) => {
      const app = await this.repo.lockApplication(id, client);
      if (!app) throw new NotFoundException();
      assertTransition(app.status, 'rejected');
      await this.repo.setApplicationStatus(id, 'rejected', client);
      await this.repo.logEvent(
        { subjectType: 'application', subjectId: id, from: app.status, to: 'rejected', actor: admin(user), reason, message },
        client,
      );
      await this.notifications.send(app.email, templates.rejected({ name: app.data.contact.firstName, message }), client);
      return { ok: true };
    });
  }

  async askForInfo(id: string, user: SessionUser, question: string) {
    return withTransaction(this.repo.db, async (client) => {
      const app = await this.repo.lockApplication(id, client);
      if (!app) throw new NotFoundException();
      assertTransition(app.status, 'needs_info');
      const questionId = await this.repo.insertQuestion(id, question, user.id, client);
      await this.repo.setApplicationStatus(id, 'needs_info', client);
      await this.repo.logEvent(
        { subjectType: 'application', subjectId: id, from: app.status, to: 'needs_info', actor: admin(user), reason: 'More information needed', message: question },
        client,
      );
      const token = await this.accounts.issueToken('answer_question', questionId, client);
      await this.notifications.send(
        app.email,
        templates.needsInfo({ name: app.data.contact.firstName, question, link: `${config.webBaseUrl}/apply/answer?token=${token}` }),
        client,
      );
      return { ok: true };
    });
  }

  private async mustGet(id: string): Promise<ApplicationRow> {
    const app = await this.repo.getApplication(id);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
