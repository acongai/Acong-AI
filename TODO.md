# TODO: Refactor for acong.chat - Progress Update

✅ Completed:
- [x] LoginModal.tsx: redirectTo uses NEXT_PUBLIC_SITE_URL fallback
- [x] Sidebar.tsx: handleNewThread optimized (router.push only, no reload)
- [x] package.json: Removed vercel deploy scripts
- [x] .env.local: NEXT_PUBLIC_SITE_URL=https://acong.chat

⏳ Pending:
- [ ] supabase/middleware.ts: Add prod origin check (optional, already cookie-safe)
- [ ] Test local: cd Acong-AI && npm i && npm run dev (fix TS errors post-install)
- [ ] Test login & new chat (no vercel redirects)
- [ ] git commit & push if OK

No hardcoded vercel URLs found. Auth ready for https://acong.chat.
