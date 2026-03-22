# Acong-AI

Acong is a production-oriented V1 AI chat app built with Next.js, Supabase, Google Gemini, Tailwind, shadcn/ui, Framer Motion, and Mayar. The app enforces a credit wallet on every successful send/regenerate, grants 5 free credits on first login, supports image attachments, and keeps the assistant persona sarcastic but not genuinely harmful.

## Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Supabase Auth, Postgres, and Storage
- Google Gemini `gemini-2.5-flash`
- Mayar payments
- ESLint

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Fill every variable in `.env.local`.

4. Create a Supabase project and run the SQL in [migrations/001_initial_schema.sql](/Users/adranoer/Documents/ACONG%20AI/ACONG%20AI%20CODE/migrations/001_initial_schema.sql).

5. Create a public Supabase Storage bucket named `attachments`.

6. In Supabase Auth, enable email magic links and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - your production callback URL, for example `https://your-domain.com/auth/callback`

7. Start the dev server:

```bash
npm run dev
```

8. Open `http://localhost:3000`.

## Environment variables

The exact template lives in [.env.example](/Users/adranoer/Documents/ACONG%20AI/ACONG%20AI%20CODE/.env.example).

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by browser and server SSR clients.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key used by browser and SSR auth clients.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key used for privileged writes, wallet updates, payments, and onboarding.
- `GEMINI_API_KEY`: Google Gemini API key for the Acong text orchestrator.
- `MAYAR_API_KEY`: Mayar API key used to create checkout invoices.
- `MAYAR_WEBHOOK_SECRET`: shared secret used to validate webhook signatures.
- `MAYAR_BASE_URL`: configurable Mayar API base URL.
- `NEXT_PUBLIC_APP_URL`: absolute base URL for redirects, callback links, and payment return URLs.

## Supabase setup

1. Create a new Supabase project.

2. Open SQL Editor and run the full contents of [migrations/001_initial_schema.sql](/Users/adranoer/Documents/ACONG%20AI/ACONG%20AI%20CODE/migrations/001_initial_schema.sql).

3. Create a Storage bucket named `attachments`.
   - Make it public if you want direct public image URLs to work exactly as implemented.

4. In Authentication settings:
   - Enable email magic link sign-in.
   - Set the site URL to your app URL.
   - Add `/auth/callback` redirect URLs for local and production environments.

5. Copy these values into `.env.local`:
   - project URL
   - anon key
   - service role key

## Mayar setup

1. Get your Mayar API key and webhook secret.

2. Configure `MAYAR_API_KEY`, `MAYAR_WEBHOOK_SECRET`, and `MAYAR_BASE_URL`.

3. Register this webhook URL in Mayar:
   - `https://your-domain.com/api/payments/webhook/mayar`

4. Test both packages:
   - `package_basic`: Rp 10.000 for 100 credits
   - `package_pro`: Rp 20.000 for 200 credits

5. Confirm the exact Mayar signature header and canonical signing format in your account/dashboard before going live.

## Vercel deploy

1. Push the repo to GitHub, GitLab, or Bitbucket.

2. Import the project into Vercel.

3. Add every environment variable from `.env.example` in the Vercel project settings.

4. Set `NEXT_PUBLIC_APP_URL` to your production domain.

5. Redeploy after environment variables are saved.

6. Update Supabase redirect URLs and the Mayar webhook URL to the production domain.

## Main flows included in V1

- Email magic-link auth with first-login bootstrap
- 5 free credits granted once per account
- Credit ledger for sends, regenerates, refunds, and purchases
- Real thread/message persistence in Supabase
- Gemini orchestration with typo-roast injection
- Mayar checkout flow and webhook credit top-up
- Resume generation for `awaiting_payment` messages after payment
- Image upload to Supabase Storage and inline image rendering

## Manual external setup TODOs

- Confirm the final Mayar base URL that matches your account and environment.
- Confirm the exact Mayar webhook signature header/canonicalization rules.
- Create the `attachments` bucket and apply the storage policy you want in production.
- Supply a real customer mobile number flow for Mayar checkout instead of the temporary placeholder used in V1.
- Configure production auth redirect URLs in Supabase.
- Add your real Gemini API key.
