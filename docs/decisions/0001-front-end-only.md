# 0001: The prototype is front-end only

- **Date:** 2026-11-17
- **Status:** accepted

## Context

The first version of this prototype had its own backend: a NestJS API, Postgres, Mailpit, simulated Stripe
and simulated AI screening. Another person now owns the backend and the database. Keeping a second
backend here would mean two diverging data models and confusion about which one is real.

## Decision

This repository holds only the web app (`apps/web`). Every data call goes through `api()` in
`apps/web/src/lib/api.ts`, which answers from an in-browser mock in `apps/web/src/lib/mock/server.ts`.
The mock's routes, request bodies and response shapes are the contract for the real backend.

The removed backend is kept at git tag `backend-prototype` as a reference.

## Consequences

- The prototype runs with `npm install && npm run dev`. No Docker, database or `.env` needed.
- Data lives in the browser's localStorage. Each person testing sees their own data; "Reset prototype data"
  in the footer goes back to the state the designs show.
- Nothing is checked or sent for real: no emails, no VAT or LUCID register lookups, no Stripe, no AI.
  The screens label these as prototype stand-ins.
- The vendor panel and the admin "Vendor checks" screens use separate sample data. An admin approving a
  section does not change the vendor panel. See `deferred.md`.
- The backend developer can read the expected data shapes from `apps/web/src/lib/vendor-panel.ts`,
  `apps/web/src/lib/sections.ts` and the routes in `mock/server.ts`.

## Undoing it

To connect the real backend, replace the body of `api()` and `uploadFile()` in `lib/api.ts` with `fetch`
calls (the pre-removal version is at tag `backend-prototype`), and delete `lib/mock/`. To bring the old
backend back: `git checkout backend-prototype -- apps/api docker-compose.yml .env.example`.
