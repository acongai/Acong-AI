# CLAUDE.md — Acong AI

Read this file fully before doing anything in this repo.

---

## What This Project Is

**Acong** is a production AI chat web app. The AI persona — also named Acong — is intentionally annoying, sarcastic, and reluctant. It answers questions but acts deeply irritated by the user's existence. Indonesian gaul language. Character-driven entertainment product, not a productivity tool.

Live at: configured via `NEXT_PUBLIC_APP_URL`
Repo: `acongai/Acong-AI` on GitHub
Deploys: Vercel (auto-deploy on push to `main`)

---

## Stack

- **Next.js 16** (App Router)
- **TypeScript** strict
- **Tailwind CSS v4**
- **shadcn/ui** for base components
- **Framer Motion** for animations
- **Supabase** — Auth, Postgres, Storage
- **Google Gemini** — `gemini-2.5-flash`, temperature 0.9, max_tokens 500
- **Mayar** — Indonesian payment gateway
- **Vercel** — deployment

---

## Critical Rules — Never Break These

1. **Never touch `main` branch directly** — work on feature branches, push, let Vercel deploy
2. **Never trust client for credit enforcement** — all credit logic is server-side only
3. **Never modify `/lib` files without explicit instruction** — business logic lives here
4. **Never scatter AI calls outside `/lib/ai/`** — all AI calls go through `orchestrator.ts`
5. **Never hardcode copy strings in components** — all user-facing strings come from `lib/copy.ts`
6. **Never break the credit ledger** — every credit movement must write a row to `credit_ledger`
7. **Do not add `/login` page back** — auth is popup-only via `components/auth/LoginModal.tsx`

---

## Folder Structure

```
/app
  /(app)/chat/[threadId]/page.tsx   — main chat page
  /(app)/layout.tsx                 — app shell layout
  /(app)/page.tsx                   — home, empty state
  /api/auth/signup/route.ts
  /api/chat/send/route.ts           — send message, debit credit
  /api/chat/regenerate/route.ts     — regenerate, debit credit
  /api/payments/create/route.ts     — create Mayar invoice
  /api/payments/webhook/mayar/route.ts — Mayar webhook handler
  /api/wallet/route.ts              — get balance
  /api/wallet/topup/route.ts        — top-up credits (DEV ONLY — no payment gate yet)
  /api/upload/route.ts
  /auth/callback/route.ts           — Supabase auth callback — DO NOT TOUCH

/components
  /auth/LoginModal.tsx              — popup-only login/register
  /auth/ConsentModal.tsx            — one-time consent screen shown after first login
  /chat/
    ChatShell.tsx
    Composer.tsx
    EmptyState.tsx
    EmptyStateMascot.tsx            — cycling mascot with cursor tracking
    MessageBubble.tsx
    MessageList.tsx
    Sidebar.tsx
    ThreadList.tsx
    TypingIndicator.tsx
  /layout/
    AppShell.tsx
    MobileDrawer.tsx
  /payments/
    CreditBadge.tsx                 — flat badge, click to open PricingPopup
    PackageSelector.tsx
    PaywallModal.tsx
    PricingPopup.tsx                — 3-plan selector, onboarding + manage modes

/lib
  /ai/
    orchestrator.ts                 — SINGLE entry point for all AI calls
    persona.ts                      — Acong system prompt (do not dilute)
    gemini.ts                       — Gemini API wrapper
    typo.ts                         — typo score + roast logic
  /auth/
    redirect.ts
    session.ts
  /billing/
    credits.ts                      — debit/refund/grant logic
    mayar.ts                        — Mayar API integration (3 TODOs — see below)
    wallet.ts
  /chat/
    messages.ts
    threads.ts
  /db/
    client.ts
    types.ts                        — typed DB interfaces
  /storage/upload.ts
  /utils/
    fingerprint.ts
    ratelimit.ts                    — in-memory, resets on cold start
  copy.ts                           — ALL user-facing strings exported here
  utils.ts

/hooks
  useAuth.ts
  useCredits.ts                     — includes onAuthStateChange for live balance sync
  useThread.ts

/supabase
  client.ts
  middleware.ts
  server.ts

/migrations
  001_initial_schema.sql
  002_add_has_consented.sql

/public/images
  ACONG BETE.png                    — default mascot (bored)
  ACONG MARAH.png                   — angry expression
  ACONG NGAMBEK.png                 — sulking expression
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User accounts, extends auth.users. Has `free_credits_granted`, `current_plan`, and `has_consented` fields |
| `wallets` | Credit balance per user |
| `credit_ledger` | Full transaction history (grant/purchase/debit/refund/admin_adjustment) |
| `chat_threads` | Conversation threads |
| `chat_messages` | Messages with status: sent/generating/awaiting_payment/completed/failed |
| `message_attachments` | File uploads linked to messages |
| `payments` | Mayar payment records |
| `payment_events` | Webhook events, deduplicated by `external_event_id` |
| `abuse_signals` | IP/fingerprint fraud tracking |

All tables have RLS enabled. Server-side code uses service role key to bypass RLS.

---

## Credit System

- 1 sent message = 1 credit (server-side debit only)
- Regenerate = 1 extra credit
- New account = 5 free credits on first login (`free_credits_granted` flag)
- If generation fails completely = refund 1 credit
- No credits = save message as `awaiting_payment`, show paywall popup
- After payment = resume pending message generation

### Plans
| Plan | Display Name | Credits | Price |
|---|---|---|---|
| `free` | "Ga Modal" | 5 | Gratis |
| `basic` | "Miskin" | 100 | Rp 10.000 |
| `pro` | "Ga miskin-miskin amat" | 200 | Rp 20.000 |

---

## Auth Flow

- Popup-only — `components/auth/LoginModal.tsx`
- No `/login` page — do not recreate it
- Email/password + Google OAuth via Supabase
- After login: `onAuthStateChange` triggers credit balance refresh
- After logout: credit balance immediately reset to null in client state
- After login: `ConsentModal` shown if `has_consented = false` in DB — user must accept before proceeding. Decline = sign out.
- After consent: `PricingPopup` shown automatically (once per session via `sessionStorage` flag `pricing_shown`)

---

## AI Persona

- Model: `gemini-2.5-flash`
- Temperature: `0.9`
- Max tokens: `500`
- Context window: last 10 messages only
- System prompt: `lib/ai/persona.ts` — ACONG_SYSTEM_PROMPT
- Persona: annoying, sarcastic, lazy, reluctant, Indonesian gaul
- Special mode: unsubscribe threat → switches to manja/flattering mode
- Safety override: distress signals → exits character, refers to Into The Light 119 ext 8
- Typo roast: only when typo score threshold exceeded (see `lib/ai/typo.ts`)

---

## Known Issues & TODOs

### Critical before production launch
1. **`/api/wallet/topup`** — currently bypasses payment. Has `// TODO: insert Mayar payment flow here before crediting`. Do NOT remove this endpoint but do NOT expose it publicly either.
2. **`lib/billing/mayar.ts`** — 3 unresolved TODOs:
   - Confirm production base URL (api.mayar.id vs mayar.id/api)
   - Confirm webhook signature header name from Mayar dashboard
   - Replace hardcoded phone number `081234567890` with real value

### Non-critical
- In-memory rate limiter resets on cold start — needs Redis for production scale
- `SMTP_EMAIL` and `SMTP_APP_PASSWORD` env vars declared but email notifications not implemented
- No admin credit adjustment UI
- No account deletion / GDPR flow
- No message search
- No thread sharing

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
MAYAR_API_KEY
MAYAR_WEBHOOK_SECRET
MAYAR_BASE_URL
NEXT_PUBLIC_APP_URL
DATABASE_URL
SMTP_EMAIL           (declared, not wired)
SMTP_APP_PASSWORD    (declared, not wired)
```

---

## Mascot

Three expressions, cycling every 10 seconds with hard cut (no fade):
1. `ACONG BETE.png` — default, bored/annoyed
2. `ACONG MARAH.png` — angry
3. `ACONG NGAMBEK.png` — sulking

Implemented in `components/chat/EmptyStateMascot.tsx`:
- Idle float animation (Framer Motion)
- Cursor tracking on desktop (rotateX/rotateY)
- No cursor tracking on touch devices
- Soft glow behind image
- Cycling via `setInterval` every 10000ms

---

## Design System

- Light mode default (dark mode: future)
- Background: `#F2F2F2`
- Surface: `#FFFFFF`
- Border: `#E4E4E4`
- Text primary: `#111111`
- Text secondary: `#666666`
- Accent: `#111111` (buttons)
- Font: Inter (via next/font/google)
- Border radius: max `rounded-xl` for cards, `rounded-md` for bubbles
- No backdrop-blur, no heavy shadows, no gradients except composer glow
- Dot grid on chat area background: `radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)` at `24px 24px`
- Composer glow: animated purple-blue gradient border (`#7c3aed` → `#2563eb`)
- App shell: `rounded-2xl overflow-hidden m-2` for floating card look

---

## Developer Notes

- Founder is non-technical — explain changes in plain language in summaries
- Vibe-coding style — translate intent to code, don't ask for code
- Always commit untracked files (especially `public/images/*`) before pushing
- After each task: list files created/modified, state assumptions, list any manual setup needed
