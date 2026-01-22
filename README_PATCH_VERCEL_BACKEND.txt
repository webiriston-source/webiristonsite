PATCH: Fix Vercel production issues (Contacts / Estimate / Admin login)

Root causes in this version:
- server/db.ts crashed at import-time if DATABASE_URL was missing (kills serverless function).
- server/storage.ts fallback wrote to project filesystem (read-only on Vercel) and did mkdir without guard.
- /api/admin/login returned 500 if ADMIN_LOGIN wasn't set.
- api/index.ts always created Postgres session store even if DATABASE_URL missing.

Fixes:
1) server/db.ts: no import-time crash. Exports hasDatabase + nullable pool/db.
2) server/storage.ts:
   - File fallback uses /tmp on Vercel/production (writable).
   - mkdir/write are guarded; in-memory fallback prevents crashes.
   - HybridStorage auto-falls back if DB not configured.
3) server/routes.ts:
   - ADMIN_LOGIN defaults to "webiriston"
   - Missing ADMIN_PASSWORD returns 503 with clear message
   - DB missing/auth errors handled (NO_DB/28P01)
4) api/index.ts:
   - Uses Postgres session store only if DATABASE_URL exists, otherwise MemoryStore
   - cookie.secure depends on Vercel/production
5) server/index.ts:
   - Remove NODE_ENV assignment (avoids build warning)
   - trust proxy enabled in production

REQUIRED Vercel Environment Variables (production):
- DATABASE_URL  (recommended: Vercel Postgres, Neon, Supabase)
- SESSION_SECRET (random 32-64+ chars)
- ADMIN_PASSWORD
Optional:
- ADMIN_LOGIN (default webiriston)
- TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (to get Telegram notifications)

After applying patch:
- Commit & push to GitHub
- In Vercel: set env vars, Redeploy
- Check Vercel Runtime Logs for POST /api/contact and /api/estimate and /api/admin/login
