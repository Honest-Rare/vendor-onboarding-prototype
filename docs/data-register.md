# Data register

Every piece of vendor data the prototype collects or shows. Update this file in the same change whenever
you add, remove or stop using a field (see [README](README.md)).

- **Where:** the screen that collects it, and the field in code.
- **Current shop:** whether today's shop already holds this data. `to check` until someone has checked it.
- **Phase:** which phase needs it. `to check` until the phase plan assigns it.

Code: application fields are in `apps/web/src/app/apply/page.tsx` (`EMPTY`), vendor panel fields in
`apps/web/src/lib/vendor-panel.ts` (`VendorPanel`, `Product`), admin section fields in
`apps/web/src/lib/mock/admin-vendors.ts` (`SECTION_DEFS`).

## Application (Apply, steps 1 to 5)

| Data | Where | Current shop | Phase |
| --- | --- | --- | --- |
| Business type (sole trader, company, small business) | Step 1 · `business.type` | to check | to check |
| Legal business name | Step 1 · `business.legalName` | to check | to check |
| Shop name | Step 1 · `business.shopName` | to check | to check |
| Country of registration | Step 1 · `business.country` | to check | to check |
| VAT ID | Step 1 · `business.vatId` | to check | to check |
| Tax number (small businesses) | Step 1 · `business.taxNumber` | to check | to check |
| Trade register number and court (companies) | Step 1 · `business.registerNumber`, `registerCourt` | to check | to check |
| Business address | Step 1 · `business.address` | to check | to check |
| Contact first and last name, role | Step 2 · `contact.*` | to check | to check |
| Contact email, phone | Step 2 · `contact.email`, `contact.phone` | to check | to check |
| Website, social media links | Step 2 · `contact.website`, `contact.socialLinks` | to check | to check |
| Categories (spirits, beer, wine, food) | Step 3 · `products.categories` | to check | to check |
| Makes own products | Step 3 · `products.makesOwnProducts` | to check | to check |
| Story | Step 3 · `products.story` | to check | to check |
| Sample photos (3 to 5) | Step 3 · `products.photoIds` | to check | to check |
| Product list or data sheets | Step 3 · `products.dataFileIds` | to check | to check |
| Number of products, price range | Step 3 · `products.productCount`, `priceRange` | to check | to check |
| Where sold today | Step 3 · `products.whereSoldToday` | to check | to check |
| Where products are made | Step 4 · `standards.madeWhere` (new) | to check | to check |
| Town and region of production | Step 4 · `standards.productionRegion` (new) | to check | to check |
| Where main ingredients come from | Step 4 · `standards.ingredientsFrom` (new) | to check | to check |
| Sold in national chains | Step 4 · `standards.retailChains` (new) | to check | to check |
| Yearly production | Step 4 · `standards.yearlyVolume` (new) | to check | to check |
| Artificial additives | Step 4 · `standards.additives` (new) | to check | to check |
| What makes the products special | Step 4 · `standards.whatMakesSpecial` (new) | to check | to check |
| Certifications and labels | Step 4 · `standards.certifications` (new) | to check | to check |
| Plan | Step 5 · `agreement.plan` | to check | to check |
| Language for emails and panel | Step 5 · `agreement.language` | to check | to check |
| Terms accepted, legal self-certification | Step 5 · `agreement.acceptTerms`, `legalSelfCertification` | to check | to check |

Step 4 questions are marked "[Mock questions, to be confirmed]" on screen.

## Vendor panel

| Data | Where | Current shop | Phase |
| --- | --- | --- | --- |
| Account email, password set date, two-factor on/off | Settings · `account.*` | to check | to check |
| Language | Settings · `account.language` | to check | to check |
| Logo, banner | Shop page §1 · `shop.logo`, `shop.banner` | to check | to check |
| Workshop photos | Shop page §1 · `shop.workshopPhotos` | to check | to check |
| Story in German and English | Shop page §2 · `shop.storyDe`, `shop.storyEn` | to check | to check |
| Town and region; website and social links | Shop page §3 · `shop.town`, `shop.links` | to check | to check |
| Email logo, favicon | Shop page, optional · `shop.emailLogo`, `shop.favicon` | to check | to check |
| Page title, meta description | Shop page, search engines · `shop.seoTitle`, `shop.seoDescription` | to check | to check |
| Google Analytics ID, Facebook pixel ID | Shop page, tracking codes · `shop.analyticsId`, `shop.pixelId` | to check | to check |
| Product basics: name, category, brand, description, photos | Product detail · `Product.*` | to check | to check |
| Price incl. VAT, VAT rate, stock, weight and package size, dimensions | Product detail · `Product.*` | to check | to check |
| Food information: legal name, net quantity, ABV, minimum age, country of origin, storage, bottler, best-before, age warning, allergens | Product detail · `Product.*` | to check | to check |
| Deposit, organic claim, contains alcohol | Product detail · `Product.deposit`, `organicClaim`, `containsAlcohol` | to check | to check |
| Category attributes (for shop filters) | Product detail · `Product.attributes` | to check | to check |
| Product safety: manufacturer, identifier, warnings, care | Product detail · `Product.safety` | to check | to check |
| Stripe account status and requirements | Payouts · `payouts.enabled`, `requirement`, `checks` (from Stripe; bank and ID data stay with Stripe) | to check | to check |
| Invoice email | Payouts · `payouts.invoiceEmail` | to check | to check |
| Accounting contact (Lexoffice) | Payouts · `payouts.accountingContactId` | to check | to check |
| ID verified by Stripe | Legal and tax · `legal.idVerifiedByStripe` | to check | to check |
| Trade register extract or business registration | Legal and tax · `legal.registerExtract` | to check | to check |
| Tax ID, issuing country, date of birth, other EU establishments (DAC7) | Legal and tax · `legal.taxId`, `taxCountry`, `dateOfBirth`, `otherEstablishments` | to check | to check |
| LUCID registration number | Legal and tax · `legal.lucidNumber` | to check | to check |
| Food business registration | Legal and tax · `legal.foodRegistration` | to check | to check |
| Alcohol tax status; tax representative for cross-border sales | Legal and tax · `legal.alcoholTaxStatus`, `taxRepresentative` | to check | to check |
| Organic certificate; other certificates and awards | Legal and tax · `legal.organicCertificate`, `otherCertificates` | to check | to check |
| Dispatch address, returns address | Shipping · `shipping.dispatchSameAsBusiness`, `dispatchAddress`, `returnsAddress` | to check | to check |
| Shipping options: zone, option, cost, delivery time, free from | Shipping · `shipping.options` | to check | to check |
| Age-checked delivery 16+ and 18+ | Shipping · `shipping.ageCheck16`, `ageCheck18` | to check | to check |
| Pickup points | Shipping · `shipping.pickupPoints` | to check | to check |
| Processing time, minimum order value, holiday and closure dates | Shipping · `shipping.processingDays`, `minimumOrder`, `closures` | to check | to check |

## Admin console: vendor check sections

The admin "Vendor checks" screen still shows the section model of the first prototype (`SECTION_DEFS`):
business verification, contact emails, tax reporting, packaging, food business registration, alcohol
tax, shipping and returns, shop profile, first product. Its fields overlap with the vendor panel above
but use separate sample data. See `deferred.md`.

| Data | Where | Current shop | Phase |
| --- | --- | --- | --- |
| Legal representative and role | Business verification | to check | to check |
| Email for new orders, for messages from Honest & Rare, for invoices | Contact emails | to check | to check |
| Customs reference (Zoll) | Alcohol tax | to check | to check |
| Product checks on/off (pre-moderation) | Business card, admin only | to check | to check |

## No longer used

| Data | Was | Why |
| --- | --- | --- |
| Shop profile legal texts typed by the vendor (legal notice, withdrawal policy, terms, privacy notice) | Old vendor section "Shop profile" | The new shop page generates them from legal and shipping data ("Automatic") |
| First product: ingredients, nutrition, food business operator name and address, unit price | Old vendor section "First product" | Replaced by the full product form; base price is calculated |
