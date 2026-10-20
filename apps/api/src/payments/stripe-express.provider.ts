import Stripe from 'stripe';
import type { PaymentsProvider, PayoutAccountStatus } from './payments.types.js';

/** Real Stripe Connect Express onboarding. Only constructed with a test-mode secret key. */
export class StripeExpressProvider implements PaymentsProvider {
  readonly simulated = false;
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    if (!secretKey.startsWith('sk_test_')) {
      throw new Error('Refusing to start Stripe with a non-test key. Use a sk_test_ key for the prototype.');
    }
    this.stripe = new Stripe(secretKey);
  }

  async createAccount(input: { email: string; country: string; businessType: 'individual' | 'company' }) {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: input.country,
      email: input.email,
      business_type: input.businessType,
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
    });
    return account.id;
  }

  async createOnboardingLink(accountId: string, urls: { returnUrl: string; refreshUrl: string }) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      return_url: urls.returnUrl,
      refresh_url: urls.refreshUrl,
    });
    return link.url;
  }

  async getStatus(accountId: string): Promise<PayoutAccountStatus> {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
      detailsSubmitted: Boolean(account.details_submitted),
      payoutsEnabled: Boolean(account.payouts_enabled),
      requirementsDue: account.requirements?.currently_due ?? [],
    };
  }
}
