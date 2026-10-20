export type RuleOutcome = 'pass' | 'fail' | 'unknown' | 'info';

export interface RuleResult {
  code: string;
  label: string;
  outcome: RuleOutcome;
  detail: string;
}

export interface DuplicateMatch {
  field: 'email' | 'vat_id' | 'shop_name' | 'phone' | 'website';
  otherId: string;
  otherShopName: string;
  otherStatus: string;
}

/** Everything the rules engine needs, handed in by the caller. The engine runs no SQL. */
export interface ApplicationFacts {
  businessType: 'sole_trader' | 'company' | 'small_business';
  legalName: string;
  country: string;
  vatId: string;
  taxNumber: string;
  registerNumber: string;
  email: string;
  phone: string;
  website: string;
  address: { street: string; postcode: string; city: string };
  categories: string[];
  photoCount: number;
  duplicates: DuplicateMatch[];
  /** Set on fictional seed applications: live calls (VIES, website) are skipped and marked as such. */
  fixture?: string;
}

export interface GateSection {
  key: string;
  title: string;
  status: 'not_started' | 'submitted' | 'approved' | 'changes_requested';
}

export interface GateResult {
  ready: boolean;
  approved: number;
  total: number;
  waitingForReview: string[];
  needsVendorAction: string[];
}
