# Honest & Rare: vendor onboarding pre-prototype

A thin working slice of the vendor onboarding flow from the PRD
("Vendor onboarding, from application to go-live"): a maker applies, rules and AI screen the
application, an admin decides, and the approved vendor sets up their shop until every section
passes a final admin check and the shop goes live.

## What runs

| Part | Tech | Where |
| --- | --- | --- |
| Storefront, admin console, vendor panel | Next.js 16, React 19 | http://localhost:3000 |
| API (modular monolith) | NestJS 12, TypeScript | http://localhost:4000 |
| Database | Postgres 18, one schema per module | localhost:55432 |
| Test inbox (all emails land here) | Mailpit | http://localhost:8026 |

Modules in `apps/api/src`: `accounts` (logins, single-use links), `vendors` (applications,
onboarding sections, admin checks), `rules` (fixed checks, go-live gate), `ai` (screening),
`payments` (Stripe Connect Express), `notifications` (email), `platform` (database, jobs, files).
Only each module's repository runs SQL.

### Stand-ins (until keys and infrastructure exist)

| Target | Now | To switch |
| --- | --- | --- |
| Claude on AWS Bedrock (EU) | **Simulated AI**: scripted results for the 5 test applications, "not screened" for anything else. Clearly labelled in the UI. | Implement a provider in `apps/api/src/ai`, using `apps/api/prompts/vendor-screening.md` |
| Stripe Connect Express | **Simulated Stripe** page in the vendor panel | Put a `sk_test_...` key in `.env` as `STRIPE_SECRET_KEY`. Live keys are refused. |
| Temporal | `platform.jobs` table with retries | |
| Valkey | In-memory rate limiting | |
| Langfuse | One structured log line per screening | |
| Brevo | Mailpit (local test inbox) | |
| Single sign-on for admins | Email and password from `.env` | |

**Real, not simulated:** the EU VAT check (VIES, free public service), website reachability check,
duplicate checks, all statuses, emails, audit history, file uploads, the go-live gate.

## Run it

### Option A: dev container (recommended)

1. Open this folder in VS Code and choose **Reopen in Container** (needs the Dev Containers extension and Docker).
2. The container installs everything, creates the database and adds the test data.
3. In the container terminal: `npm run dev`
4. Open http://localhost:3000. The test inbox runs at http://localhost:8026.

### Option B: on your Mac

Needs Node 22.9 or newer and Docker.

```sh
cp .env.example .env        # once
npm install
npm run services:up         # Postgres + Mailpit
npm run db:migrate
npm run db:seed             # admin login + 5 fictional test applications
npm run dev                 # API and web together
```

Start again from scratch: `npm run db:reset`

## Try the flow

1. **Admin console**: http://localhost:3000/admin, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.
   Five fictional test applications are waiting (good fit, organic winery, UK reseller, borderline
   herb farm, thin application with a duplicate phone number).
2. **Approve** one (for example Brennerei Kellerwald). Open the test inbox, open the welcome email, and click the set-password link.
3. **Vendor panel**: fill in each section and send it for review. Set up payouts (simulated).
4. **Admin console → Vendor checks**: approve each section, or request changes.
5. When every section is approved, the vendor sees **Go live**.

To test the storefront side, go to http://localhost:3000, click **Apply to sell**, and use any
email address: the confirmation email arrives in the test inbox.

## Placeholders (see the PRD's open questions)

- Link expiry times: email confirmation 3 days, question 14 days, set password 3 days (`apps/api/src/config.ts`)
- Plan names, commission and limits; vendor terms and privacy texts
- German language: built for, switched off
- "Not mainstream" has no fixed line yet; the AI only reports evidence

## Not production-ready

Local file storage without virus scanning, in-memory rate limiting, no captcha, basic protection
against server-side requests to internal addresses (no DNS checks), and no automatic expiry job yet.
