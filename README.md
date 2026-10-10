# VELORA

A complete Next.js / Node.js storefront based on **VELORA _ Online Clothing Store (4).html**, prepared for Vercel and Supabase. The original HTML is preserved. Its 32 sample products, 23 embedded product photographs, and original gold VELORA artwork have been extracted into reusable assets.

## What is included

- Responsive cream, bronze and gold storefront, home page, collections, search, size/price/type filters, sorting and pagination.
- Product pages, persistent shopping bag and wishlist, size selection and stock availability.
- Supabase email/password accounts, email verification, sign-in, sign-out, password recovery and customer order history.
- Sri Lankan delivery addresses and LKR prices, configurable delivery charges and free-delivery threshold.
- Cash on delivery, plus **bank transfer → private receipt upload → admin approval → dispatch**. No payment gateway is required.
- Admin dashboard, product creation/editing, image uploads, per-size inventory, hidden products, orders and payment review.
- Super admin controls for staff access, bank details and delivery settings. Admins manage products, orders and payment reviews.
- Database-enforced permissions, private receipts, transactional stock reservations, server-authoritative prices, duplicate-request protection and an audit trail.

**Current state:** the application is built locally. It is not deployed and is not connected to a live Supabase project. Without environment variables it deliberately shows a labelled sample catalogue, and authentication/checkout do not pretend to work. Your Vercel and Supabase accounts are needed to activate the live store.

The storefront now follows the original HTML's catalogue layout: its black VELORA banner, gold-gradient branding and buttons, two-row header, left filters, featured panel and bordered product cards. Size selection and the green Add to bag buttons connect to the website checkout.

## Where files are saved after deployment

| Files                                            | Location                                                                           | Access                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Original photos extracted from the supplied HTML | `public/images/`, deployed with the website on Vercel                              | Public                                                 |
| New product photos uploaded by staff             | Supabase Storage → `product-images/<generated-id>.webp`                            | Public; staff can upload                               |
| Customer bank-transfer slips                     | Supabase Storage → `payment-receipts/<customer-id>/<order-id>/<generated-id>.webp` | Private; the owning customer and authorised staff only |

The database holds product image URLs and receipt file paths, rather than the image files themselves. Receipt viewing links expire after five minutes. Uploaded files stay in Supabase Storage across Vercel deployments; they are not written to Vercel's temporary filesystem. The database migration creates both buckets and their access policies. The original bundled photos are not automatically copied into Supabase; replacing one through the product editor stores its replacement there.

## 1. Run locally

Use Node.js 22 LTS or a newer supported LTS release.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. You can browse the demo immediately. Set the variables below and restart to enable the backend.

## 2. Set up Supabase

1. Create a Supabase project in a region appropriate for your customers, for example Singapore.
2. Open **SQL Editor** and run the files in `supabase/migrations/` in filename order (`001`, `002`, then `003`). They create the tables, functions, RLS policies, audit trail, colour-aware inventory, customer delivery reviews and Storage buckets.
3. Optionally run [supabase/seed.sql](supabase/seed.sql) for the catalogue from your HTML. **The seed uses sample stock of 10 units per size. Review real products, prices, descriptions, photographs, sizes and inventory before opening.** Nine products without embedded photos use a neutral illustrated placeholder.
4. Copy your project URL and **publishable key** from the project API settings into `.env.local`. A service-role secret is not used by this application.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=YOUR_REAL_COUNTRY_CODE_AND_NUMBER
NEXT_PUBLIC_SUPPORT_EMAIL=YOUR_REAL_SUPPORT_EMAIL
```

Leave the optional contact values empty to hide the respective link. The WhatsApp number uses digits only, for example the country code `94` followed by the business number without a leading domestic zero. Do not use a placeholder bank account or support number for launch.

The CSP in `next.config.ts` allows standard `*.supabase.co` project hosts. If you use a custom Supabase domain, add that exact HTTPS/WSS host to the appropriate `connect-src` and `img-src` directives before deploying.

### Authentication

- Enable the Email provider in Supabase Auth; keep **Confirm email** enabled.
- Set minimum password length to **12** in the Supabase password policy as well as the app.
- Set Auth **Site URL** to your final website origin, and add only your actual callback URLs to the redirect allowlist. During development include `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/auth?mode=update`.
- Before launch configure your own SMTP sender, with an address on your business domain. Supabase's default test mail service is unsuitable for general customer email delivery.
- The app supports the PKCE `/auth/callback` flow. For email links that also work when opened on another device, set the confirmation template link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

- Set the reset-password template link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Reset your password</a
>
```

- Supabase Auth applies its own authentication rate limits. Review these for your expected traffic. The order RPC separately limits each verified customer to five new orders per hour.

Official references: [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Create the first super admin

1. Open `/auth`, create your own account and confirm your email.
2. Replace the email in [supabase/bootstrap-super-admin.sql](supabase/bootstrap-super-admin.sql) with that verified email, then run it in Supabase SQL Editor as the project owner.
3. Sign in and open **`/admin`**.
4. In **Team**, grant access to other people after they have registered and verified their email. Choose Admin or Super admin. Removing staff access keeps their customer account intact. You cannot change your own role from the dashboard.

| Capability                         | Customer | Admin | Super admin |
| ---------------------------------- | -------- | ----- | ----------- |
| Buy and view own orders            | Yes      | Yes   | Yes         |
| Upload own bank receipt            | Yes      | Yes   | Yes         |
| Create/edit products and stock     | No       | Yes   | Yes         |
| See all orders and review payments | No       | Yes   | Yes         |
| Manage fulfilment                  | No       | Yes   | Yes         |
| Grant/revoke staff access          | No       | No    | Yes         |
| Change bank/delivery settings      | No       | No    | Yes         |
| Read audit log                     | No       | No    | Yes         |

Role data lives in a protected database table, not editable user metadata. Every privileged RPC rechecks the current role in the database, so revoking access also blocks old sessions from making privileged changes.

## 4. Configure payment and delivery

Open **`/admin/settings`** as a super admin:

1. Enter the real bank name, account holder, account number and branch.
2. Enable bank transfers only after verifying those details.
3. Set your delivery fee and free-delivery threshold. Defaults are LKR 450 and LKR 15,000.

Bank transfers are disabled until configured. Cash on delivery is always available. There is no card gateway or automatic bank integration.

### Bank-transfer flow

1. A verified customer places an order. The database checks active products and available stock, calculates the actual prices and shipping, and reserves inventory in one transaction.
2. The customer sees the total, bank details and `VL-...` reference on their order page. Bank details are saved with the order so a later settings change cannot silently change an existing order's destination.
3. The customer transfers the money outside the website and uploads a **JPG, PNG or WebP image up to 4 MB**. Photograph a paper receipt or take a screenshot of a digital receipt. PDF slips are not accepted in this version. The limit leaves room for form data within [Vercel's function request limit](https://vercel.com/docs/functions/limitations), and is checked in both the browser and server.
4. The upload is decoded, checked and re-encoded as WebP, with metadata removed. It is stored in the private `payment-receipts` bucket. The customer and authorised staff can open a five-minute signed link; anonymous visitors and other customers cannot read it.
5. In **Orders & payments → Payments to review**, an admin opens the receipt and checks the actual credit in the bank account. Approving marks the payment paid and the order confirmed. Rejecting requires a customer-facing reason and allows the customer to upload a replacement.
6. Only after approval can a bank-transfer order progress to Shipped and Delivered.

### Cash-on-delivery flow

Orders go from Pending → Confirmed → Shipped → Delivered. Marking a COD order Delivered records payment as collected. Admins should confirm actual collection with their courier before doing this.

### Cancellations and refunds

Pending or confirmed unpaid orders can be cancelled. Their reserved stock is returned exactly once. Cancelled orders cannot be reopened. Paid orders cannot be cancelled through this workflow: handle bank refunds, returns and their records directly with the customer. This application does not execute refunds or include a returns/refund-management subsystem.

Pending bank orders reserve stock until fulfilled or manually cancelled. Review abandoned unpaid orders regularly; there is no automatic expiry job. The customer account and order page show payment/fulfilment updates. Auth emails are supported; order-status emails, SMS, courier integrations and marketing/rewards are not implemented.

## 5. Deploy on Vercel

1. Put this folder in a private Git repository and import it into Vercel. The `.gitignore` excludes local secrets and generated files.
2. Select the **Next.js** framework preset and Node.js **22.x** (or newer compatible LTS). Build command: `npm run build`. Keep Vercel's default Next.js output settings.
3. Add the environment variables from `.env.example` in Vercel Project Settings. Use your production HTTPS origin for `NEXT_PUBLIC_SITE_URL`.
4. Deploy. A separate Express server is unnecessary: Next.js server actions and route handlers run on Vercel's Node.js runtime.
5. Update the Supabase Auth Site URL and allowed callback URLs to the final Vercel/custom domain. If using custom email templates, their `SiteURL` must match that domain.
6. Redeploy whenever changing `NEXT_PUBLIC_*` variables; those values may be embedded during the build.
7. Run the live acceptance checks below with your real Supabase project and SMTP configuration.

Alternatively use the Vercel CLI from this folder after signing in to your Vercel account: `npx vercel`. To publish production after reviewing its preview: `npx vercel --prod`.

Official references: [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs), [environment variables](https://vercel.com/docs/environment-variables).

## Validation

### GitHub Actions

[`.github/workflows/test-website.yml`](.github/workflows/test-website.yml) runs automatically on pushes and pull requests. You can also run **Actions → Test website → Run workflow** after the workflow is on the repository's default branch. No GitHub secrets are required.

The job installs the lockfile dependencies with Node.js 22, runs the validation and isolated PostgreSQL tests, builds the production app, checks TypeScript, installs Chromium with Linux dependencies, and runs Playwright against the production server. Desktop and mobile Chromium checks cover all sample product pages, category pages, public information/account-entry pages, shopping flows, protected-page redirects, image loading, responsive overflow and 404s. This is viewport testing with Chromium, not a separate Safari test.

Download **website-test-results** from the workflow run's **Artifacts** section. It contains an HTML report (`playwright-report/index.html`), JUnit results, full-page screenshots of the main public pages and a sample product, plus screenshots/videos/traces for failed tests. Reports are retained for 14 days. To explore the downloaded report locally, run `npx playwright show-report <path-to-playwright-report>`.

CI deliberately uses the preview catalogue and an isolated PGlite database. It never writes to your production Supabase project. It tests the database business rules and access restrictions, but authenticated admin/customer screens, real receipt uploads, SMTP and Supabase's HTTP services still require the live acceptance checks below. There is no deployment or automatic publishing in this workflow. The setup follows the [Playwright CI guide](https://playwright.dev/docs/ci).

### Run the checks locally

```powershell
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The database suite executes the actual migration and seed in embedded PostgreSQL (PGlite), with stubs only for Supabase-owned auth/storage schemas. It checks role restrictions, order ownership, authoritative pricing, duplicate-request protection, stock reservation/restoration, private receipts and payment approval. It does not replace testing the actual Supabase Auth, email delivery, Storage HTTP API or Vercel deployment. Browser tests cover the local preview's catalogue, wishlist, bag, login guard and responsive layout on desktop and mobile.

### Live acceptance checks before opening

- Register and confirm two different customer accounts; verify each can only see their own orders and receipts.
- Set up one admin and one super admin; confirm an admin cannot manage Team or Store settings.
- Add a real product and upload its image. Verify prices and stock for every size.
- Place a COD order and a bank-transfer order. Check stock, shipping fees, private receipt upload, rejection/re-upload, approval and delivery status changes.
- Test email confirmation, password reset and sign-out against your SMTP setup.
- Replace sample inventory and placeholder photos. Review product content and the delivery, exchange, privacy and terms pages to match your actual business operations.
- Enter the real bank and contact details, check mobile checkout, and configure Supabase backups for your chosen plan.

## Project map

- `src/app/` — storefront, customer pages, staff dashboard, Node.js server actions and auth routes.
- `src/components/` — responsive interface and interactive shopping flows.
- `src/lib/` — validated schemas, Supabase server client, access checks and data queries.
- `src/data/products.json` — preview-only catalogue; live mode reads Supabase and never falls back to sample data on a database error.
- `public/images/` — assets extracted from your original HTML, plus a placeholder illustration.
- `supabase/migrations/` — ordered database migrations for RLS, transactional business functions, colour-aware inventory and private/public buckets.
- `supabase/seed.sql` — optional sample catalogue.
- `supabase/bootstrap-super-admin.sql` — one-time owner bootstrap.
- `tests/`, `scripts/test-database.ts` — validation, database security and browser checks.

Product images are public. Order data and payment slips are private. No service-role secret is required in the website. Server actions enforce same-origin requests, input validation and authentication; database grants and RLS provide a separate permission boundary. Security headers are configured in `next.config.ts`. Next.js hydration requires inline scripts with the current static-compatible CSP; this is not a strict nonce-based CSP. Keep dependencies updated, and treat live security testing as part of operating the store.

The catalogue and policy wording are starting content based on the supplied HTML; product photography should be replaced with your own authorised, accurate stock photography as needed. `npm run assets:import` regenerates the sample files from the original HTML and overwrites the generated seed and preview JSON, so use it only when deliberately refreshing those files.
