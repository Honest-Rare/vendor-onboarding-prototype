import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config.js';
import { EU_COUNTRIES, isEu, normalizeVatId } from './eu.js';
import type { ApplicationFacts, GateResult, GateSection, RuleResult } from './rules.types.js';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com',
]);

const FIELD_LABELS: Record<string, string> = {
  email: 'email',
  vat_id: 'VAT ID',
  shop_name: 'shop name',
  phone: 'phone',
  website: 'website',
};

/**
 * Checks with a right answer. Plain TypeScript, no AI.
 * Outcomes: pass, fail (admin should look), unknown (could not be checked), info (for the admin's attention).
 */
@Injectable()
export class RulesService {
  private readonly logger = new Logger('Rules');

  async checkApplication(facts: ApplicationFacts): Promise<RuleResult[]> {
    const skipped = (code: string, label: string): RuleResult => ({
      code,
      label,
      outcome: 'unknown',
      detail: 'Fictional test application: live check skipped.',
    });
    const [vat, website] = facts.fixture
      ? [skipped('vat', 'VAT ID (EU VIES)'), skipped('website', 'Website reachable')]
      : await Promise.all([this.checkVat(facts), this.checkWebsite(facts.website)]);
    return [
      this.checkRegisteredInEu(facts.country),
      vat,
      this.checkDuplicates(facts),
      this.checkEmailDomain(facts.email),
      this.checkPhone(facts.phone),
      website,
      this.checkAddress(facts.address.street),
      this.checkCompanyRegister(facts),
      this.checkPhotos(facts.photoCount),
      ...this.categoryNotes(facts.categories),
    ];
  }

  /** The go-live gate: every section that applies to this vendor must be approved. */
  gate(sections: GateSection[]): GateResult {
    const approved = sections.filter((s) => s.status === 'approved');
    return {
      ready: sections.length > 0 && approved.length === sections.length,
      approved: approved.length,
      total: sections.length,
      waitingForReview: sections.filter((s) => s.status === 'submitted').map((s) => s.title),
      needsVendorAction: sections
        .filter((s) => s.status === 'not_started' || s.status === 'changes_requested')
        .map((s) => s.title),
    };
  }

  categoryFlags(categories: string[]) {
    return {
      alcohol: categories.some((c) => c === 'spirits' || c === 'beer' || c === 'wine'),
      spirits: categories.includes('spirits'),
    };
  }

  private checkRegisteredInEu(country: string): RuleResult {
    return isEu(country)
      ? { code: 'eu_registered', label: 'Registered in the EU', outcome: 'pass', detail: EU_COUNTRIES[country].name }
      : {
          code: 'eu_registered',
          label: 'Registered in the EU',
          outcome: 'fail',
          detail: `Registered in ${country}, outside the EU. Our criteria ask for EU-based producers.`,
        };
  }

  private async checkVat(facts: ApplicationFacts): Promise<RuleResult> {
    const label = 'VAT ID (EU VIES)';
    if (facts.businessType === 'small_business' && !facts.vatId) {
      return {
        code: 'vat',
        label,
        outcome: 'unknown',
        detail: `Small business without VAT ID; tax number ${facts.taxNumber || '(missing)'} cannot be checked automatically.`,
      };
    }
    const vatId = normalizeVatId(facts.vatId);
    const country = EU_COUNTRIES[facts.country];
    if (!country) return { code: 'vat', label, outcome: 'unknown', detail: 'Country outside the EU; VIES does not apply.' };

    const prefix = vatId.slice(0, 2);
    const number = vatId.slice(2);
    if (prefix !== country.vatPrefix || !/^[0-9A-Z+*]{2,12}$/.test(number)) {
      return {
        code: 'vat',
        label,
        outcome: 'fail',
        detail: `"${facts.vatId}" is not a valid ${country.name} VAT ID format (should start with ${country.vatPrefix}).`,
      };
    }
    if (!config.viesEnabled) {
      return { code: 'vat', label, outcome: 'unknown', detail: 'Format is valid. Live VIES check is switched off.' };
    }

    try {
      const res = await fetch(
        `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${prefix}/vat/${encodeURIComponent(number)}`,
        { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`VIES answered ${res.status}`);
      const body = (await res.json()) as { isValid?: boolean; name?: string; userError?: string };
      if (body.userError && !['VALID', 'INVALID'].includes(body.userError)) {
        return { code: 'vat', label, outcome: 'unknown', detail: `VIES could not answer (${body.userError}). Try again later.` };
      }
      if (!body.isValid) {
        return { code: 'vat', label, outcome: 'fail', detail: `${vatId} is not registered as valid in VIES.` };
      }
      const registeredName = body.name && body.name !== '---' ? body.name : '';
      if (registeredName && !namesMatch(registeredName, facts.legalName)) {
        return {
          code: 'vat',
          label,
          outcome: 'fail',
          detail: `Valid, but registered to "${registeredName}", not "${facts.legalName}".`,
        };
      }
      return {
        code: 'vat',
        label,
        outcome: 'pass',
        detail: registeredName ? `Valid, registered to "${registeredName}".` : 'Valid. (This country does not share the registered name.)',
      };
    } catch (error) {
      this.logger.warn(`VIES check failed: ${error instanceof Error ? error.message : error}`);
      return { code: 'vat', label, outcome: 'unknown', detail: 'VIES could not be reached. Rerun the checks later.' };
    }
  }

  private checkDuplicates(facts: ApplicationFacts): RuleResult {
    if (facts.duplicates.length === 0) {
      return { code: 'duplicates', label: 'Duplicate check', outcome: 'pass', detail: 'No matches with other applications or vendors.' };
    }
    const lines = facts.duplicates.map(
      (d) => `Same ${FIELD_LABELS[d.field]} as "${d.otherShopName}" (${d.otherStatus.replace('_', ' ')})`,
    );
    return { code: 'duplicates', label: 'Duplicate check', outcome: 'fail', detail: lines.join('; ') };
  }

  private checkEmailDomain(email: string): RuleResult {
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    return DISPOSABLE_DOMAINS.has(domain)
      ? { code: 'email_domain', label: 'Email domain', outcome: 'fail', detail: `${domain} is a disposable email service.` }
      : { code: 'email_domain', label: 'Email domain', outcome: 'pass', detail: domain };
  }

  private checkPhone(phone: string): RuleResult {
    const normalized = phone.replace(/[\s\-()/.]/g, '').replace(/^00/, '+');
    return /^\+[1-9]\d{6,14}$/.test(normalized)
      ? { code: 'phone', label: 'Phone format', outcome: 'pass', detail: normalized }
      : { code: 'phone', label: 'Phone format', outcome: 'fail', detail: `"${phone}" has no country code (for example +49).` };
  }

  private async checkWebsite(website: string): Promise<RuleResult> {
    const label = 'Website reachable';
    if (!website) return { code: 'website', label, outcome: 'unknown', detail: 'No website given; social links only.' };
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    if (!isPublicWebUrl(url)) {
      return { code: 'website', label, outcome: 'fail', detail: `"${website}" is not a public web address.` };
    }
    try {
      const res = await fetch(url, {
        // Redirects are not followed: a redirect could point at an internal address.
        redirect: 'manual',
        headers: { 'user-agent': 'HonestRareOnboardingCheck/0.1' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status >= 300 && res.status < 400) {
        return { code: 'website', label, outcome: 'pass', detail: `${url} redirects to ${res.headers.get('location') ?? 'another page'}.` };
      }
      if (res.status < 400) return { code: 'website', label, outcome: 'pass', detail: `${url} answered ${res.status}.` };
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        return { code: 'website', label, outcome: 'unknown', detail: `${url} blocks automatic checks (${res.status}). Open it by hand.` };
      }
      return { code: 'website', label, outcome: 'fail', detail: `${url} answered ${res.status}.` };
    } catch {
      return { code: 'website', label, outcome: 'fail', detail: `${url} could not be reached.` };
    }
  }

  private checkAddress(street: string): RuleResult {
    return /\b(postfach|p\.?\s?o\.?\s?box|postbox)\b/i.test(street)
      ? { code: 'address', label: 'Business address', outcome: 'fail', detail: 'Looks like a PO box, not a business address.' }
      : { code: 'address', label: 'Business address', outcome: 'pass', detail: 'Street address given.' };
  }

  private checkCompanyRegister(facts: ApplicationFacts): RuleResult {
    if (facts.businessType !== 'company') {
      return { code: 'register', label: 'Trade register', outcome: 'info', detail: 'Not a company; no register entry expected.' };
    }
    return facts.registerNumber
      ? { code: 'register', label: 'Trade register', outcome: 'unknown', detail: `${facts.registerNumber} given. Register lookup is not automated yet.` }
      : { code: 'register', label: 'Trade register', outcome: 'fail', detail: 'Company without a register number.' };
  }

  private checkPhotos(count: number): RuleResult {
    return count >= 3 && count <= 5
      ? { code: 'photos', label: 'Sample photos', outcome: 'pass', detail: `${count} photos.` }
      : { code: 'photos', label: 'Sample photos', outcome: 'fail', detail: `${count} photos; we ask for 3 to 5.` };
  }

  private categoryNotes(categories: string[]): RuleResult[] {
    const flags = this.categoryFlags(categories);
    const notes: RuleResult[] = [];
    if (flags.spirits) {
      notes.push({
        code: 'spirits',
        label: 'Spirits',
        outcome: 'info',
        detail: 'After approval: alcohol tax status, German delivery only, 18+ age-checked delivery.',
      });
    } else if (flags.alcohol) {
      notes.push({ code: 'alcohol', label: 'Alcohol', outcome: 'info', detail: 'After approval: 16+ age-checked delivery.' });
    }
    return notes;
  }
}

/**
 * The website comes from the applicant, so the server must not be tricked into calling internal addresses.
 * Basic guard for the prototype; production also needs DNS-resolution checks (rebinding) and an egress proxy.
 */
export function isPublicWebUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return false;
    }
  }
  if (host.includes(':')) return false; // IPv6 literals: not needed for vendor websites
  return true;
}

function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\b(gmbh|ug|haftungsbeschränkt|kg|ohg|gbr|e\.?k\.?|ltd|bv|sarl|srl|sl|ab)\b/g, '').replace(/[^a-z0-9äöüß]/g, '');
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}
