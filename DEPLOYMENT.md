# VELORA – Deployment Guide (Vercel + Supabase)

Hosting: **Vercel** runs the Next.js website. **Supabase** provides the database, customer login and file storage (product photos, bank-transfer receipts). No separate backend server is needed. No Supabase service-role key is used.

Time needed: about 30–45 minutes.

---

## 0. Before you start

You need:

- A GitHub account (the repo is `RandimaDulmini/VELORA`).
- A free [Supabase](https://supabase.com) account and a free [Vercel](https://vercel.com) account (sign in to Vercel with GitHub).
- Node.js 22 or newer, for local testing.
- Your real business details: WhatsApp number, support email, bank account details.

Check locally that everything is green first:

```powershell
npm ci
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

The same steps run on GitHub under **Actions → Test website**. Deploy only when it is green.

---

## 1. Push the code to GitHub

```powershell
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

`.env*` files are git-ignored (only `.env.example` is committed). Never commit secrets.

> Do not commit `VELORA _ Online Clothing Store (4).html` unless you want it in the repo. It is the 2 MB design reference, and the extracted images and products are already in `public/images` and `src/data`.

---

## 2. Create the Supabase project

1. **New project** at https://supabase.com/dashboard. Choose a region close to your customers (for Sri Lanka, **Singapore** or **Mumbai**) and save the database password.
2. Open **SQL Editor → New query**. Paste the whole of [supabase/migrations/001_store.sql](supabase/migrations/001_store.sql) and click **Run**. This creates the tables, security rules (RLS), order and stock functions, audit log and the two Storage buckets (`product-images`, public; `payment-receipts`, private).
3. Optional: run [supabase/seed.sql](supabase/seed.sql) to load the 32 sample products (10 units of stock per size). Edit or replace these with your real stock before launch.
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable (anon) key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

   Do **not** copy the `service_role` / secret key anywhere.

### 2.1 Authentication settings (Authentication → …)

| Setting | Value |
| --- | --- |
| Providers → Email | Enabled |
| Confirm email | **On** |
| Password minimum length | **12** (matches the app) |
| URL Configuration → Site URL | your final URL, e.g. `https://velora.vercel.app` (update after step 3) |
| Redirect URLs | `https://YOUR_DOMAIN/auth/callback`, `https://YOUR_DOMAIN/auth/callback?next=/auth?mode=update`, plus `http://localhost:3000/auth/callback` for local testing |

**Email templates** (Authentication → Emails). Paste these links so confirmation works on any device:

- Confirm signup: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`
- Reset password: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>`

**SMTP**: Supabase's built-in mailer is only for testing, with very low limits. Before launch add your own SMTP provider under Authentication → SMTP (Resend, Brevo, SendGrid, etc.) using a sender address on your own domain.

---

## 3. Deploy on Vercel

1. In Vercel: **Add New → Project → Import** `VELORA` from GitHub.
2. Settings (usually auto-detected):
   - Framework Preset: **Next.js**
   - Node.js Version: **22.x** (Project Settings → General)
   - Build Command: `npm run build`, with the default output directory.
3. Under **Environment Variables**, add these for **Production** (and Preview if you want):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` (or your custom domain) |
   | `NEXT_PUBLIC_WHATSAPP_NUMBER` | digits only, e.g. `94771234567` (optional) |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@yourdomain.com` (optional) |

4. Click **Deploy**.
5. Copy the final URL, then return to Supabase **Authentication → URL Configuration** and set the Site URL and Redirect URLs to it (step 2.1).
6. `NEXT_PUBLIC_*` values are baked in at build time. After changing any of them, **Redeploy**.

If you don't set the Supabase variables, the site runs in "preview" mode with the sample catalogue, and login and checkout are disabled.

### Custom domain (optional)

Vercel → Project → **Settings → Domains** → add your domain and follow the DNS instructions. Then update `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL and Redirect URLs, and redeploy.

If you use a **custom Supabase domain**, add that exact host to `connect-src` and `img-src` in [next.config.ts](next.config.ts). Standard `*.supabase.co` hosts already work.

---

## 4. Create the first super admin

1. Open your live site → `/auth`, register with your own email, and confirm it from the email.
2. Open [supabase/bootstrap-super-admin.sql](supabase/bootstrap-super-admin.sql), replace the email with yours, and run it in the Supabase SQL Editor.
3. Sign in and open `/admin`.
4. **Admin → Settings**: enter the real bank details, enable bank transfer, and set the delivery fee and free-delivery threshold (defaults LKR 450 and 15,000).
5. **Admin → Team**: give other registered, verified people Admin or Super admin access.

---

## 5. Where things are stored

| Data | Location |
| --- | --- |
| Products, orders, customers, settings | Supabase Postgres |
| Bundled product photos | `public/images/` (deployed with the site) |
| Photos uploaded by staff | Supabase Storage → `product-images` (public) |
| Bank-transfer receipts | Supabase Storage → `payment-receipts` (private, viewing links expire in 5 minutes) |

Uploads survive redeploys because they are not saved on Vercel's disk.

---

## 6. Go-live checklist

- [ ] GitHub Actions run is green.
- [ ] Two customer accounts only see their own orders and receipts.
- [ ] One Admin and one Super admin exist, and an Admin cannot open Team or Settings.
- [ ] Real products, prices, per-size stock and photos are entered (replace sample data and placeholders).
- [ ] A COD order and a bank-transfer order both work end to end: stock, receipt upload, reject and re-upload, approve, dispatch.
- [ ] Signup confirmation, password reset and sign-out emails arrive from your own SMTP sender.
- [ ] Real bank, WhatsApp and support email entered; mobile checkout checked.
- [ ] Supabase backups configured for your plan (Project Settings → Database → Backups).
- [ ] Info pages (delivery, privacy, terms) match your real policies.

---

## 7. Updating the site later

- Code change: `git push` to `main`. Vercel redeploys automatically, and every push also runs the tests.
- Database change: add a new SQL file under `supabase/migrations/` and run it in the SQL Editor. Never edit the applied migration in place.
- Env var change: edit it in Vercel, then **Redeploy**.

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Store preview" banner on the live site | Supabase env vars are missing or wrong. Fix them in Vercel and redeploy. |
| Confirmation or reset links go to localhost | Supabase **Site URL** is still localhost. Update it. |
| Images from Supabase don't load | Custom Supabase domain missing from the CSP in `next.config.ts`. |
| Can't sign in as admin | Bootstrap SQL not run, or the email is unverified or typed differently. |
| Not receiving emails | Built-in Supabase mailer is rate-limited. Configure custom SMTP. |
| Build fails on Vercel | Check Node is 22.x, and run `npm run build` locally to see the error. |
| GitHub Actions red | Open the run → download `website-test-results` artifact → open `playwright-report/index.html`. |
