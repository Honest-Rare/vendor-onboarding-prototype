# Sample vendor: Heidegeist Manufaktur

Fictional test business for walking through the vendor onboarding flow. All names, numbers,
addresses and documents are invented. Copy each value into the matching form field.

**Why this business:** it sells **spirits + food** and is a **company (UG)**, so it exercises the
most paths: register number required, the extra *Alcohol tax* section, *Age-checked delivery*,
ABV on the product, and no date of birth (companies skip it). It does not collide with the seeded
test applications, so the duplicate checks stay clean.

---

## Part 1: Apply to sell (http://localhost:3000 → Apply to sell)

### Business

| Field | Value |
| --- | --- |
| Business type | Company (GmbH, UG, GbR and others) |
| Legal business name | Heidegeist Manufaktur UG (haftungsbeschränkt) |
| Shop name | Heidegeist |
| Country | DE (Germany) |
| VAT ID | DE298374615 |
| Tax number | 37/215/04821 |
| Register number | HRB 209481 |
| Register court | Amtsgericht Lüneburg |
| Street | Heideweg 14 |
| Postcode | 29646 |
| City | Bispingen |

### Contact

| Field | Value |
| --- | --- |
| First name | Lena |
| Last name | Brakhage |
| Role | Managing director |
| Email | *use any address, e.g.* `lena@heidegeist.example` (the email lands in Mailpit, http://localhost:8026) |
| Phone | +49 5194 774210 |
| Website | heidegeist.example |
| Social links | instagram.com/heidegeist.example |

### Products

| Field | Value |
| --- | --- |
| Categories | Spirits, Food |
| Do you make your products? | Yes, we make everything ourselves |
| Number of products | 6 |
| Price range | €9 – €42 |
| Where sold today | Our farm shop in Bispingen, two delicatessens in Lüneburg, Christmas markets in Hamburg |
| Photos (3–5) | everything in `application-photos/` |
| Plan | Starter |
| Terms + legal self-certification | tick both |

**Story** (needs at least 80 characters):

> We are a small distillery on the edge of the Lüneburg Heath. Since 2021 we have made gin,
> herbal liqueur and heather syrup in a 150-litre copper still in our old barn. We pick the
> heather blossom ourselves in late summer, buy juniper from a farm two villages away and use
> honey from the heath beekeepers. Everything is distilled, macerated, bottled and labelled by
> hand, in batches of around 300 bottles. No flavourings, no colourings, no sugar beyond honey.

---

## Part 2: Vendor panel sections (after an admin approves the application)

### Business verification
| Field | Value |
| --- | --- |
| Legal representative | Lena Brakhage |
| Their role | Managing director (Geschäftsführerin) |
| Trade register extract | `documents/handelsregister-auszug.pdf` |

### Tax reporting
| Field | Value |
| --- | --- |
| Tax identification number | 37/215/04821 |
| Country that issued it | Germany |
| Permanent establishments in other EU countries | *leave empty* |

*(No date of birth: it only appears for sole traders and small businesses.)*

### Packaging registration
| Field | Value |
| --- | --- |
| LUCID registration number | DE4827153920481 |

### Food business registration
| Field | Value |
| --- | --- |
| Registered with (authority) | Landkreis Heidekreis, Veterinär- und Lebensmittelüberwachungsamt |
| Registration reference | HK-LMR-2021-0457 |
| Registration confirmation | `documents/lebensmittelbetrieb-registrierung.pdf` |
| Organic certification body code | *leave empty* |

### Alcohol tax
| Field | Value |
| --- | --- |
| Alcohol tax status | My spirits are taxed (tax-paid goods) |
| Customs reference (Zoll) | DE00483921700000 |
| Germany only | tick |

### Shipping and returns
| Field | Value |
| --- | --- |
| Dispatch address | *leave empty* |
| Returns address | Heidegeist Manufaktur UG, Heideweg 14, 29646 Bispingen, Germany |
| Days to dispatch | 2 |
| Age-checked delivery | DHL age check on delivery |

**Shipping countries and costs:**
> Germany: €5.90, free from €75. Syrups also to Austria and the Netherlands: €11.90.
> Spirits are delivered within Germany only.

### Shop profile
| Field | Value |
| --- | --- |
| Location and region | Bispingen, Lüneburg Heath, Lower Saxony |
| Logo | `shop-profile/logo.png` |
| Banner image | `shop-profile/banner.jpg` |

**About you:**
> Heidegeist is Lena Brakhage and a 150-litre copper still in a converted barn on the Lüneburg
> Heath. Every August we pick heather blossom by hand, then distil it with local juniper into
> our Heidegin. Our syrups are made from the same blossom and heath honey. Small batches, no
> flavourings, everything bottled and labelled on the farm.

**Legal notice (Impressum):**
> Heidegeist Manufaktur UG (haftungsbeschränkt)
> Heideweg 14, 29646 Bispingen, Germany
> Managing director: Lena Brakhage
> Phone: +49 5194 774210 · Email: hallo@heidegeist.example
> Register: Amtsgericht Lüneburg, HRB 209481
> VAT ID: DE298374615

**Right of withdrawal and returns policy:**
> You may withdraw from your purchase within 14 days of receiving the goods without giving a
> reason. To withdraw, email hallo@heidegeist.example or write to the address above. Send
> unopened goods back to Heideweg 14, 29646 Bispingen; we refund the purchase price and standard
> shipping within 14 days of receiving them. Opened bottles of spirits and food cannot be
> returned for hygiene reasons unless they were faulty on arrival.

### First product
| Field | Value |
| --- | --- |
| Product name | Heidegin – Heather Blossom Dry Gin |
| Legal product name | Gin |
| Net quantity | 0.5 l |
| Alcohol by volume (%) | 43 |
| Ingredients | Alcohol from grain, water, juniper berries, heather blossom, coriander seed, lemon peel, angelica root |
| Allergens | none |
| Price incl. VAT (EUR) | 36.90 |
| Product photo | `shop-profile/first-product-heidegin.jpg` |

**Description:**
> A dry gin distilled with hand-picked heather blossom from the Lüneburg Heath and juniper from
> a neighbouring farm. Floral on the nose, then resinous juniper and a soft honeyed finish.
> Made in batches of around 300 bottles. Try it with a dry tonic and a strip of lemon peel.

### Payouts
Use the simulated Stripe page; no data needed.

---

## Negative tests (`negative-tests/`)

These should all be refused by the upload:

| File | Expected |
| --- | --- |
| `wrong-format.gif` | Only JPG, PNG, WebP or PDF allowed |
| `not-an-image.txt` | Same, and refused as an application photo |
| `too-large-over-8mb.png` | Over the 8 MB limit |

Also try submitting the application with only 2 photos (needs 3) or a story under 80 characters.

## What will not pass (expected)

- **VAT ID**: the VIES check is real, and DE298374615 is made up, so it will show as not valid.
- **Website**: `.example` domains never resolve, so the reachability check fails.
- **AI screening**: shows "not screened", since the simulated AI only has scripted results for the 5 seeded applications.

These give the admin something to look at, which is useful for testing the review screen.
