# Taxi Admin Dashboard — Driver App

One of three apps sharing a single Supabase backend (project ref `xigqjacbhvrvpqaxtsxu`). This is the **driver-facing** app. The other two: `taxi-passenger-pwa` (customer booking) and `owner-dashboard` (platform oversight) — separate repos, separate Vercel deployments.

## Stack
Vite + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`, no separate config file — see `src/index.css`). Deployed on Vercel. Client-side routing via `window.history.pushState`, not a router library — see `SCREEN_PATHS`/`screenFromPath` in `App.tsx`.

## Design system
Light/cream theme (`#F7F7F5` background), "embossed" soft-shadow buttons (`.emboss-btn`/`.emboss-btn-primary`), Space Grotesk headings + Inter body, blue accent `#185FA5`. This app does NOT have the dark-theme toggle system — that's passenger-only so far (see that repo's CLAUDE.md).

## Navigation
Desktop: collapsible sidebar (dark navy `#0F172A`). Mobile: same sidebar as a slide-in overlay via hamburger, PLUS a fixed bottom nav bar (`sm:hidden`) with 5 slots — Home/Bookings/+(quick add)/Earnings/Settings. Adding a nav destination means updating both, plus `vercel.json`'s rewrites or direct URL navigation 404s.

## File sizes worth knowing before editing
`AllBookingsScreen.tsx` (~1,100 lines) and `CustomersScreen.tsx` (~1,000 lines) are the largest. Point at a specific function/section rather than "look at this file."

## Architecture facts that aren't obvious from the code alone
- **Account creation is two-step, always**: `supabase.auth.signUp()` client-side, then `signup-driver` edge function (passenger repo) creates the `drivers` row — RLS blocks a direct insert.
- **Onboarding is 6 steps**: Business Details → Stripe Connect (skippable) → Subscription → Vehicle (skippable) → Fare Rules (auto-seeds real NTA tariffs, not editable) → SPSV Licence (skippable, but blocks going online until approved).
- **A driver cannot toggle online until `licence_verified = true`** — enforced server-side, not just UI.
- **Fare rates are never driver-editable** — only `discount_percent`. Real NTA tariffs seeded once via `seed-fare-rules`.
- **Cash-payment deposit is a real, driver-controlled toggle** (`drivers.deposit_enabled`, default `true` — preserves existing behavior for every driver who's never touched it). Configured in Settings → Fare Rules & Discounts, at the bottom, below the tariff rules. When off, a "pay later" (cash) booking charges genuinely nothing up front — no Stripe PaymentIntent at all, not even a €0 one.
- **`booking_slug`** generated once at signup from the business name, permanent, forms the driver's public passenger URL (`taxi-passenger-pwa.vercel.app/<slug>`).
- **The Overview/home screen has a real QR code + share-link card** (`ShareLinkCard.tsx`) — the QR is generated entirely client-side (`qrcode` npm package), no external service, no network call.

## Hard-won lessons (each a real bug found and fixed)
- Never leave an onboarding step that *looks* like it saves data without verifying it actually persists.
- Debug/diagnostic UI must be gated behind `import.meta.env.DEV`, never shipped unconditionally — a "temporary, remove later" comment is not a safeguard. Found and fixed on this exact codebase once already; the same bug independently existed on the passenger app too (fixed there separately).
- `public/manifest.json` and its icons are easy to lose in an unrelated commit and easy not to notice. Confirm they exist in `dist/` after any build touching `public/`.
- On iOS, `PushManager` doesn't exist outside a home-screen-installed standalone app — check `isIosNonStandalone()` (`pushNotifications.ts`) before assuming push is simply unsupported; show real install guidance instead of a dead end.
- **A CSS toggle switch built with Tailwind spacing classes + `transform: translateX()` rendered its knob outside the track in production**, even though the math looked correct on paper. Rebuilt using fully explicit inline pixel dimensions (`position`/`left`/`top`/`width`/`height` all as literal numbers, no Tailwind utility classes on the switch itself) — more verbose, but eliminates an entire category of unit/class-purging/stacking-context mismatches that are hard to debug without live DOM access. Prefer this approach for any future custom toggle/slider component.
- **`CREATE OR REPLACE FUNCTION` does NOT replace a function whose parameter list differs** — it silently creates a second overloaded version alongside the original. This broke every real booking in production for a period (adding an optional 3rd parameter to `is_driver_available_at` in the passenger repo left the old 2-parameter version still live, and Postgres couldn't decide which to use for a 2-argument call). **Any future function signature change must either match the existing signature exactly, or explicitly `DROP FUNCTION` the old signature first** — check `pg_proc` for existing overloads before assuming a signature change is safe. Also watch for views/other objects depending on the old signature (this one required recreating a dependent view too, via `DROP FUNCTION ... CASCADE` then `CREATE VIEW` with its real captured-from-`pg_views` definition, not a guessed one).

## Before considering any change done
```bash
npm run build
npx tsc --noEmit
```
Both should be clean (a few pre-existing `tsc` errors inside `supabase/functions/` are expected — Deno files, not part of this app's build).

## Related repos
- Backend functions live in the **passenger** repo (`taxi-passenger-pwa/supabase/functions/`), shared across all three apps.
- Owner oversight app: `owner-dashboard` — can suspend a driver (`drivers.is_active`) and approve/reject their licence.
