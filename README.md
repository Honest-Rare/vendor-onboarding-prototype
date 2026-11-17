# Honest & Rare: vendor onboarding pre-prototype

A clickable front end for the vendor onboarding flow from the PRD
("Vendor onboarding, from application to go-live"): a maker applies, an admin reviews the application,
and the approved vendor sets up their shop in the vendor panel until it can go live.

**Front end only.** There is no backend in this repository. Every screen gets its data from an in-browser
mock with sample data (Brennerei Kellerwald and four other fictional applicants). The backend and
database are built separately. See [decision 0001](docs/decisions/0001-front-end-only.md).

| Part | Where |
| --- | --- |
| Storefront and application form | http://localhost:3000 |
| Admin console | http://localhost:3000/admin |
| Vendor panel | http://localhost:3000/vendor |

## Run it

### Option A: dev container

1. Open this folder in VS Code and choose **Reopen in Container** (needs the Dev Containers extension and Docker).
2. In the container terminal: `npm run dev`
3. Open http://localhost:3000.

### Option B: on your computer

Needs Node 22.9 or newer.

```sh
npm install
npm run dev
```

Check types with `npm run typecheck`.

## Try the flow

Any email and password sign you in to the admin console and the vendor panel.

1. **Apply**: go to http://localhost:3000 and click **Apply to sell**. The "fill in the Brennerei
   Kellerwald example" link fills every step. After sending, the "Check your email" page links straight to
   the confirmation step (no email is sent).
2. **Admin console**: five sample applications are waiting, plus any you sent. Approve, reject or ask a
   question. **Vendor checks** shows approved vendors and their setup sections.
3. **Vendor panel**: sign in, or open the set-password page at `/vendor/set-password`. The panel shows
   Brennerei Kellerwald part-way through setup. The **Prototype state** switch at the bottom of the
   sidebar jumps to "Ready to go live" or "Live".

Your changes stay in this browser. **Reset prototype data** in the footer of the public pages goes back
to the sample data.

## Where things are

| Path | What |
| --- | --- |
| `apps/web/src/app/` | Pages: `/`, `/apply`, `/admin`, `/vendor` |
| `apps/web/src/lib/api.ts` | The one place pages get data from. Swap its body for `fetch` to use a real backend. |
| `apps/web/src/lib/mock/server.ts` | The mock API: every route the screens use, with request and response shapes |
| `apps/web/src/lib/mock/*.json, *-fixtures.ts` | Sample data |
| `apps/web/src/lib/vendor-panel.ts` | Vendor panel data shape and every status rule (sidebar icons, go-live checks) |
| `apps/web/public/mock-files/` | Sample photos and documents |
| `sample-vendor/` | A second fictional business for typing in by hand |

The former backend (NestJS API, Postgres, Mailpit) is at git tag `backend-prototype`.

## Documentation

Phases, the data register (what the current shop has, what we have, which phase needs it), deferred
features and decisions are in [docs/](docs/README.md).

## Placeholders (see the PRD's open questions)

Values still open are shown in [brackets] on screen, for example plan names and commission, link expiry
dates, image sizes, review times and shipping costs.
