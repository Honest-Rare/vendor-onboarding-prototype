import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { PG_POOL, type Db } from '../platform/database.js';
import type { PaymentsProvider, PayoutAccountStatus } from './payments.types.js';

/**
 * Pretends to be Stripe Connect until test keys exist. The "onboarding link" opens a local page
 * in the vendor panel where the vendor clicks through instead of entering real details.
 */
@Injectable()
export class SimulatedPaymentsProvider implements PaymentsProvider {
  readonly simulated = true;

  constructor(@Inject(PG_POOL) private readonly db: Db) {}

  async createAccount(input: { email: string; country: string }) {
    const accountId = `acct_sim_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.db.query('insert into payments.simulated_accounts (account_id, email, country) values ($1, $2, $3)', [
      accountId,
      input.email,
      input.country,
    ]);
    return accountId;
  }

  async createOnboardingLink(accountId: string) {
    return `${config.webBaseUrl}/vendor/stripe-simulated?account=${encodeURIComponent(accountId)}`;
  }

  async getStatus(accountId: string): Promise<PayoutAccountStatus> {
    const { rows } = await this.db.query(
      'select details_submitted, payouts_enabled from payments.simulated_accounts where account_id = $1',
      [accountId],
    );
    if (!rows[0]) throw new NotFoundException('Simulated account not found');
    return {
      detailsSubmitted: rows[0].details_submitted,
      payoutsEnabled: rows[0].payouts_enabled,
      requirementsDue: rows[0].payouts_enabled ? [] : ['external_account', 'representative.verification.document'],
    };
  }

  /** What Stripe would do once the vendor finishes its onboarding pages. */
  async completeOnboarding(accountId: string) {
    await this.db.query(
      'update payments.simulated_accounts set details_submitted = true, payouts_enabled = true where account_id = $1',
      [accountId],
    );
  }
}
