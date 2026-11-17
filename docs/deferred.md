# Deferred

Features and behaviour left out on purpose. Each `// LATER(P<n>)` marker in the code has a row here
(find them with `grep -rn "LATER(P" apps/`).

**Phase numbers:** `P2` means "after this front-end pre-prototype". The real phase for each row still has
to be assigned in the phase plan.

| What | Now | Phase | Where |
| --- | --- | --- | --- |
| Backend and database | In-browser mock with sample data, kept in localStorage. Owned by the backend developer. See [decision 0001](decisions/0001-front-end-only.md). | P2 | `lib/api.ts`, `lib/mock/server.ts` |
| Emails: confirmation, question to applicant, approval with set-password link, new link | None sent. "Check your email" links straight to the confirmation step. | P2 | `mock/server.ts` (`POST /applications`) |
| Application checks: EU VIES VAT check, website reachability, duplicates | Sample results for the 5 sample applications; new applications get "Unknown" | P2 | `mock/server.ts` (`simulatedRules`) |
| AI screening of applications | Scripted results for the 5 sample applications, "No information" for new ones. Labelled "Simulated AI". | P2 | `mock/server.ts` (`simulatedAi`) |
| AI drafts: English story, meta description | A labelled placeholder draft the vendor edits; never saved automatically | P2 | `mock/server.ts` (`/vendor/shop/draft`) |
| Stripe Connect onboarding and status updates | A prototype page stands in for Stripe; "Finish" marks payouts enabled | P2 | `mock/server.ts` (`/vendor/payouts/stripe-complete`), `vendor/stripe-simulated` |
| LUCID register lookup | Format check only (DE + 13 digits) | P2 | `mock/server.ts` (`/vendor/legal/lucid`) |
| Admin final approval of go-live | Vendor can send for final approval; no admin screen approves it. Use the "Prototype state" switch to see the live panel. | P2 | `mock/server.ts` (`/vendor/go-live`) |
| Link between admin "Vendor checks" and the vendor panel | Separate sample data. The admin screen keeps the section model; approving a section does not change the vendor panel. | P2 | `mock/admin-vendors.ts`, `mock/vendor-panel-fixtures.ts` |
| Orders | Empty page in the live vendor panel | P2 | `app/vendor/orders/page.tsx` |
| Pause shop (holiday, stock) | Button shows a prototype note | P2 | `app/vendor/page.tsx` |
| Public shop page | "View your shop" opens the Preview tab of the shop page builder | P2 | `app/vendor/page.tsx` |
| Review of changes after go-live (for example an updated story) | Shown as a "Things to do" item only; the shop page cannot show the pending change | P2 | `mock/vendor-panel-fixtures.ts` (`liveTasks`) |
| Category attribute lists for shop filters | Free-text attributes; placeholder selects "[Attribute for …]" | to check | `app/vendor/products/[id]/page.tsx` |
| Import from Shopify or Shopware | Adds one placeholder draft product | P2 | `mock/server.ts` (`/vendor/products/import`) |
| Email change confirmation, password reset by link, two-factor set-up | Settings change straight away, with prototype notes | P2 | `app/vendor/settings/page.tsx` |
| Admin single sign-on | Any email and password sign in | P2 | `mock/server.ts` (`/auth/login`) |
| File storage and virus scanning | Uploads stay in the browser tab (object URLs) and are gone after a reload | P2 | `mock/server.ts` (`takeUpload`) |
| German interface | English only; the language setting is stored but not applied | to check | |
| Food business operator name and address on products | Not in the new product design (the old "First product" section had it). EU food information rules may require it for food; to check with legal. | to check | `app/vendor/products/[id]/page.tsx` |
| Support contact for vendors | "[support email]" placeholder | to check | `app/vendor/payouts`, `app/vendor/settings` |
