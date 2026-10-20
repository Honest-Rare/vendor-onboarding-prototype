export const PAYMENTS_PROVIDER = Symbol('PAYMENTS_PROVIDER');

export interface PayoutAccountStatus {
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
}

/** Connected-account onboarding. Identity, IBAN and owners are collected on Stripe's pages, never by us. */
export interface PaymentsProvider {
  readonly simulated: boolean;
  createAccount(input: { email: string; country: string; businessType: 'individual' | 'company' }): Promise<string>;
  createOnboardingLink(accountId: string, urls: { returnUrl: string; refreshUrl: string }): Promise<string>;
  getStatus(accountId: string): Promise<PayoutAccountStatus>;
}
