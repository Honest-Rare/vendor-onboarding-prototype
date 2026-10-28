-- Additions from the comparison with the current shop's data and the feedback on D06 Vendor onboarding.

-- Versioned "click to accept" terms: which version was accepted, and when each confirmation was given.
alter table vendors.applications
  add column terms_version           text,
  add column terms_accepted_at       timestamptz,
  add column legal_self_certified_at timestamptz;

update vendors.applications
   set terms_accepted_at = coalesce(submitted_at, created_at),
       legal_self_certified_at = coalesce(submitted_at, created_at)
 where terms_accepted_at is null;

-- Business details move onto the vendor at approval, so they can change later without touching the application.
alter table vendors.vendors
  add column legal_name     text,
  add column vat_id         text,
  add column tax_number     text,
  add column street         text,
  add column postcode       text,
  add column city           text,
  add column country        text,
  add column slug           text unique,      -- vendor page address, for example "brennerei-kellerwald"
  add column pre_moderation boolean not null default true;  -- our team checks new and edited products

update vendors.vendors v
   set legal_name = a.legal_name,
       vat_id     = a.vat_id,
       tax_number = nullif(a.data -> 'business' ->> 'taxNumber', ''),
       street     = a.data -> 'business' -> 'address' ->> 'street',
       postcode   = a.data -> 'business' -> 'address' ->> 'postcode',
       city       = a.data -> 'business' -> 'address' ->> 'city',
       country    = a.country,
       slug       = trim(both '-' from regexp_replace(
                      replace(replace(replace(replace(lower(v.shop_name), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
                      '[^a-z0-9]+', '-', 'g')) || '-' || left(v.id::text, 8)
  from vendors.applications a
 where a.id = v.application_id;

alter table vendors.vendors
  alter column legal_name set not null,
  alter column country set not null,
  alter column slug set not null;

-- New setup section for existing vendors.
insert into vendors.sections (vendor_id, key, status)
select id, 'contacts', 'not_started' from vendors.vendors
on conflict do nothing;
