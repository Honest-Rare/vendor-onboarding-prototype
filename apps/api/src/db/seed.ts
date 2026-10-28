// Creates the admin login and the fictional test applications, then queues their screening.
// The running API (or the next start) picks up the queued jobs.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AccountsService } from '../accounts/accounts.service.js';
import { AppModule } from '../app.module.js';
import { config } from '../config.js';
import { FilesService } from '../platform/files.service.js';
import { JobsService } from '../platform/jobs.service.js';
import { VendorsRepository } from '../vendors/vendors.repository.js';
import { placeholderPng } from './placeholder-image.js';
import { FIXTURES } from './seed-fixtures.js';

async function main() {
  process.env.JOBS_WORKER = 'off';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    await app.get(AccountsService).ensureAdmin(config.adminEmail, config.adminPassword);
    console.log(`Admin login: ${config.adminEmail} / (ADMIN_PASSWORD from .env)`);

    const repo = app.get(VendorsRepository);
    const files = app.get(FilesService);
    const jobs = app.get(JobsService);

    const { rows } = await repo.db.query(`select count(*)::int as n from vendors.applications where data ? 'fixture'`);
    if (rows[0].n > 0) {
      console.log('Test applications already exist. Use `npm run db:reset` to start again.');
      return;
    }

    for (const fixture of FIXTURES) {
      const photoIds: string[] = [];
      for (const [i, color] of fixture.colors.entries()) {
        const buffer = placeholderPng(color);
        const saved = await files.save(
          { buffer, originalname: `${fixture.key}-${i + 1}.png`, mimetype: 'image/png', size: buffer.length },
          'application',
          null,
        );
        photoIds.push(saved.id);
      }
      const data = { ...fixture.data, products: { ...fixture.data.products, photoIds, dataFileIds: [] }, fixture: fixture.key };
      const id = await repo.insertApplication(data, config.termsVersion);
      await files.assignOwner(photoIds, id);
      await repo.setApplicationStatus(id, 'submitted');
      await repo.logEvent({ subjectType: 'application', subjectId: id, to: 'submitted', actor: 'seed', reason: 'Fictional test application' });
      await jobs.enqueue('screen_application', { applicationId: id });
      console.log(`Added test application: ${fixture.data.business.shopName}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
