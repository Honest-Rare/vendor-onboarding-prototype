-- One schema per module. Only each module's repository reads or writes its schema.

create schema if not exists identity;   -- Accounts module
create schema if not exists vendors;    -- Vendors module
create schema if not exists payments;   -- Payments module
create schema if not exists platform;   -- Shared infrastructure: jobs, files

-- Accounts ---------------------------------------------------------------

create table identity.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  role          text not null check (role in ('admin', 'vendor')),
  password_hash text,
  created_at    timestamptz not null default now()
);

create table identity.sessions (
  token_hash text primary key,
  user_id    uuid not null references identity.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Single-use links: email confirmation, answer a question, set password.
create table identity.one_time_tokens (
  token_hash text primary key,
  purpose    text not null check (purpose in ('confirm_email', 'answer_question', 'set_password')),
  subject_id uuid not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Vendors ----------------------------------------------------------------

create table vendors.applications (
  id            uuid primary key default gen_random_uuid(),
  status        text not null check (status in
                  ('email_unconfirmed', 'submitted', 'in_review', 'needs_info', 'approved', 'rejected', 'expired')),
  email         text not null,
  shop_name     text not null,
  legal_name    text not null,
  business_type text not null,
  country       text not null,
  vat_id        text,
  phone         text,
  website       text,
  categories    text[] not null,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  decided_at    timestamptz
);
create index applications_status_idx on vendors.applications (status);
create index applications_email_idx on vendors.applications (lower(email));
create index applications_vat_idx on vendors.applications (vat_id);

-- Results of the rules engine and the AI screening, one row each per application.
create table vendors.application_checks (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references vendors.applications (id) on delete cascade,
  kind           text not null check (kind in ('rules', 'ai')),
  status         text not null check (status in ('pending', 'done', 'failed')),
  result         jsonb,
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (application_id, kind)
);

create table vendors.questions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references vendors.applications (id) on delete cascade,
  question       text not null,
  answer         text,
  asked_by       uuid,
  asked_at       timestamptz not null default now(),
  answered_at    timestamptz
);

create table vendors.vendors (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null unique references vendors.applications (id),
  user_id           uuid not null,
  shop_name         text not null,
  status            text not null check (status in ('onboarding', 'ready', 'live')),
  stripe_account_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  live_at           timestamptz
);

-- Each setup step the vendor completes; every one ends with an admin (or Stripe) check.
create table vendors.sections (
  vendor_id   uuid not null references vendors.vendors (id) on delete cascade,
  key         text not null,
  status      text not null check (status in ('not_started', 'submitted', 'approved', 'changes_requested')),
  data        jsonb not null default '{}'::jsonb,
  admin_note  text,
  updated_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  primary key (vendor_id, key)
);

-- Audit log: every status change, decision and message.
create table vendors.events (
  id           bigserial primary key,
  subject_type text not null check (subject_type in ('application', 'vendor', 'section')),
  subject_id   uuid not null,
  from_status  text,
  to_status    text,
  actor        text not null,
  reason       text,
  message      text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index events_subject_idx on vendors.events (subject_id, created_at);

-- Payments ---------------------------------------------------------------

-- Only used by the simulated Stripe provider.
create table payments.simulated_accounts (
  account_id        text primary key,
  email             text not null,
  country           text not null,
  details_submitted boolean not null default false,
  payouts_enabled   boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Platform ---------------------------------------------------------------

-- Background jobs with retries. Stand-in for Temporal workflows.
create table platform.jobs (
  id         bigserial primary key,
  kind       text not null,
  payload    jsonb not null,
  status     text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts   int not null default 0,
  run_after  timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on platform.jobs (status, run_after);

create table platform.files (
  id            uuid primary key default gen_random_uuid(),
  owner_type    text not null check (owner_type in ('application', 'vendor')),
  owner_ref     text,
  original_name text not null,
  mime_type     text not null,
  size_bytes    int not null,
  stored_name   text not null,
  created_at    timestamptz not null default now()
);
