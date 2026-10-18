# DEVELOPMENT.md — developer & architecture guide

Deep reference for working **on the code**. If you're **installing/deploying** this POS, start at the root **`CLAUDE.md`** (install guide) instead. This file is the source of truth for stack, architecture, DB, auth, theming, printing, and the subsystems below.

**posee** (package `posee`) — a restaurant POS product. The repo is generic and ships with **no shop data** — the owner sets shop name / menu / tables / theme via `/setup` and the Settings page. Started local-first (single SQLite file); also runs on **Vercel + Turso** (libSQL) so customers scan table QRs from their own phones. UI and domain strings are **Thai**; keep new user-facing text in Thai to match.

## Commands

```bash
npm run dev          # dev server → http://localhost:3000
npm run build        # production build
npm run start        # run production build
npm run lint         # next lint

npm run db:push      # apply src/db/schema.ts to sqlite.db (drizzle-kit push — interactive, see Schema notes)
npm run db:seed      # seed initial data — only runs when DB is empty
npm run db:studio    # Drizzle Studio (browse DB in browser)
npm run setup        # db:push + db:seed

npm run tts:gen      # regenerate ElevenLabs voice mp3s → public/audio/ (needs ELEVENLABS_API_KEY in .env)
npm run music:gen    # regenerate the music bed → public/audio/music-bed.mp3
```

No test suite exists. First-time setup: `npm install && npm run setup && npm run dev`. On first request `ensureSeeded()` (called from `layout.tsx`) auto-seeds an empty DB, so `db:seed` is a manual convenience.

Run all commands from the repo root.

**Verifying changes** (no automated tests): `npx tsc --noEmit` for types, then exercise flows end-to-end against the running dev server. Public routes take plain `curl` (`POST /api/table-order`, `/api/payment-request`, `/api/order-cancel`); staff/admin routes and pages need the session cookie — `curl -c c.txt -X POST /api/login --data "username=admin&password=<POS_ADMIN_PASSWORD>&next=/"` then `-b c.txt` (login redirects to `/login?error=1` on failure — a 303 alone isn't success; check the `location`). Inspect/clean up test rows with `sqlite3 sqlite.db` (local) or `turso db shell posee-pos` (prod). Note: **server actions in `actions.ts` can't be called standalone** (their `revalidatePath` throws outside a request context) — drive them through the UI/curl, or test the equivalent `*FromApi` function in `restaurant-order-service.ts` (which have no `revalidatePath`).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 · Drizzle ORM + **libSQL** (`@libsql/client`). Path alias `@/*` → `src/*`. Deploys on **Vercel + Turso** (steps in DEPLOY.md); `DATABASE_URL` is `file:sqlite.db` locally or `libsql://…turso.io` (+ `DATABASE_AUTH_TOKEN`) in prod. Push to `main` → Vercel auto-deploys; or `vercel --prod`. Env (passwords, `POS_AUTH_TOKEN`, Turso creds, ElevenLabs) live in Vercel project settings (or your host), never committed.

**Live domain:** your **primary** Vercel production domain is the URL to give customers / print into QRs. It stays public because Vercel Authentication ("Deployment Protection") is on **Standard Protection**, which exempts only the primary production domain — other generated/alias `*.vercel.app` URLs return a 302 to Vercel SSO. So QR codes (built from `window.location.origin`) must be generated while on the public domain, and don't expect a custom alias to be public unless protection is fully **Disabled**.

## Theming (มะนาว × พริก default, light+dark)

Colors are **CSS-variable tokens**, not hardcoded hex. Never reintroduce raw `#hex` in components.
- **`src/app/globals.css`** defines all tokens on `:root`, with overrides under `:root[data-theme="dark"]` and a `prefers-color-scheme: dark` block (for `:root:not([data-theme="light"])`). Two token families: channel-form `--brand-*` / `--accent-*` (e.g. `--brand-primary: 217 58 43`) consumed by Tailwind, and full-color `--c-*` (e.g. `--c-surface`, `--c-primary`, `--c-scrim`) used in arbitrary values.
- **`tailwind.config.ts`** maps `brand-*`/`accent-*` to `rgb(var(--brand-x) / <alpha-value>)`, so `bg-brand-primary`, `text-brand-ink`, etc. flip with theme automatically.
- In `className` arbitrary values use the `--c-*` vars: `bg-[var(--c-surface)]`, `shadow-[0_6px_0_var(--c-primary-dark)]`, `rgba(var(--c-sh),.1)`; **color-ambiguous prefixes need a hint** — `text-[color:var(--c-muted)]`, `border-[color:var(--c-border)]`.
- Theme toggle + persistence: `ThemeToggle` in `AppShell.tsx` writes `localStorage["pos-theme"]` and sets `data-theme` on `<html>`; an inline script in `layout.tsx` `<head>` applies it before paint (no flash). Editing `tailwind.config.ts` requires a **dev server restart** (config is cached).
- Print receipts are forced black-on-white regardless of theme (see `globals.css` `@media print`).

## Audio notifications (ElevenLabs)

`src/lib/sound.ts` plays voice mp3s from `public/audio/` (cached `Audio` elements so timer-triggered playback survives autoplay policy) with a fallback to browser SpeechSynthesis; a "มุ้งมิ้ง" music bed (`music-bed.mp3`) plays under each line. `SoundNotifier.tsx` (mounted globally in `AppShell`) polls `/api/notifications` every 4s and announces new orders / ready / payment-requested on **every page** once the user enables sound (browser requires one tap → `primeAudio`). Regenerate files: `npm run tts:gen` (voices, driven by `.env` `ELEVENLABS_VOICE_ID`/`_MODEL`) and `npm run music:gen` (bed). `.env` holds the key (gitignored); `.env.example` stays blank.

## Per-menu options

`products.options` is a JSON column (nullable). `getMenuOptionGroups()` in `src/lib/menu-options.ts` returns the menu's own option groups if set, else falls back to category defaults. Edit per-menu via `/products` → แก้ไข → "ตัวเลือกเมนู". `createProduct`/`updateProduct` take an `OptionInput[]` and serialize it.

## Settings, tables & money math

`/settings` (`SettingsClient.tsx`) edits the single `settings` row **and** manages tables. Configurable: shop name, phone, address, receipt footer, **PromptPay ID** (feeds the payment QR in `StaffTablesClient`), **service charge %**, **VAT %**.
- **Service charge + VAT** are applied **only in `createOrder`** (counter POS): `afterDisc → +service → +VAT → finalTotal`, percentages read live from the `settings` row; the breakdown is returned to the client for the receipt. Both default 0 (no behavior change). **QR/table orders stay item-sum** — svc/VAT is not applied to `createTableOrder`.
- **Table management** — `createTable`/`renameTable`/`toggleTable`/`deleteTable` in `actions.ts`; `deleteTable` refuses if an active session exists. QR image URL from `tableOrderQrUrl(origin, token)` in `utils.ts` (external `api.qrserver.com`, encodes `origin/table/<token>`); the QR modal and receipts print via the `@media print` allowlist (`.receipt-print`, `.qr-print`).

## Mobile / responsive

Customer `/table` is mobile-first. Staff/admin pages are **desktop-first with mobile overrides added on top** — default (mobile) styles are compact, `lg:` restores the desktop layout. `AppShell.tsx`: sidebar shows only `lg:`, a bottom nav (3 primary items + a "เพิ่มเติม" sheet) shows below `lg:`; page content has `pb-[68px] lg:pb-0` to clear it.
- **Gotcha:** never wrap a page in a height-constrained `flex flex-col` on mobile — flex children shrink to fit and their content overflows/overlaps (this was the `/staff` bug). Use normal block flow (`overflow-y-auto` + margins) on mobile and switch to `lg:grid`/`lg:flex` for the multi-column desktop layout.
- Fixed-width modals must be `w-full max-w-[…]`, wide tables get their own `overflow-x-auto` container, and the floating SoundNotifier button sits at `bottom-[80px] lg:bottom-4` to clear the bottom nav.
- **Sheet/modal gotcha (small screens like the Sunmi):** a bottom-anchored modal must be a `flex flex-col max-h-[…]` with the action button pinned (`shrink-0`) and the middle `flex-1 overflow-auto` — a fixed inner `max-h-[..vh]` inside `overflow-hidden` clips the confirm button off-screen. Its action button must also **clear the fixed bottom nav** (`z-40`) — the counter POS product-options + payment modals hit this. Anything the operator must reach on a phone (e.g. the counter/table target picker) must be visible in the mobile layout, not only inside a hidden bottom-sheet.

## Menu photo upload

`products.photo` holds either a `/menu/…` path (seed data) or a **data-URI JPEG** uploaded from the browser — no external storage. `src/lib/image.ts` `resizeImageToDataUrl()` downscales to ~500px + compresses before storing. `ProductsClient` form: upload/remove photo, emoji stays as fallback (rendered when `photo` is null). Turso free tier (9GB) easily holds these.

## Thermal printing (ESC/POS, multi-transport)

Kitchen tickets (`KitchenClient`, no prices) and customer receipts (`PosClient`/`OrdersClient`, with prices) both build ESC/POS bytes in **`src/lib/escpos.ts`** (`buildKitchenTicket()` / `buildReceipt()`) and send them via **`src/lib/thermal.ts`** `printBytes()`, which tries transports in order and falls back to `window.print()` (hidden `.kitchen-ticket-print` / `.receipt-print` block, CSS allowlist in `globals.css` `@media print`):
1. **Sunmi WebView bridge** — `window.SunmiPrint.printBase64()` (injected by the native app, below) → the Sunmi built-in printer.
2. **RawBT** — `intent:…scheme=rawbt` on Android (opt-in).
3. **Local bridge** — `POST http://127.0.0.1:9100/print`.
4. **Web Serial** — USB/serial (`isThermalSupported()`, Chrome/Edge desktop).

**Encoding matters per printer** (`escposEncoding()` in `thermal.ts`, override via `localStorage["pos-print-mode"]` / `["pos-print-encoding"]`):
- **Sunmi built-in printer wants UTF-8**, *not* TIS-620 — TIS-620 prints Thai as garbage on Sunmi. `buildReceipt`/`buildKitchenTicket` take a `PrinterEncoding` (`"utf8"` when the Sunmi bridge is present, else `"tis620"` for Epson-style; UTF-8 emits the `FS & / FS C 0xFF` enable prefix, TIS-620 emits `ESC t THAI_CODE_TABLE`).
The ESC/POS path is **untested without hardware** — Thai garbled → adjust encoding / `THAI_CODE_TABLE`; layout skewed → `RECEIPT_WIDTH` (58mm=32, 80mm=48).

## Sunmi built-in printer — native WebView app (`sunmi-print-app/`)

Plain Chrome on a Sunmi **cannot** reach the built-in printer (it's behind Sunmi's AIDL service, not USB/BT/Web-Serial). So `sunmi-print-app/` is a thin Android app: a full-screen WebView that loads the live POS URL (`MainActivity.kt` `posUrl`) and injects `window.SunmiPrint.printBase64(b64)` → `SunmiPrinterService.sendRAWData()` (dep `com.sunmi:printerlibrary` on Maven Central). No test suite; the real test is that it builds + prints on the device.
- **Build:** GitHub Actions (`.github/workflows/build-print-apk.yml`) builds the APK on any push under `sunmi-print-app/**`, commits it to `public/print-app.apk` (served at `/print-app.apk`), and uploads it as an artifact. No local Android SDK needed.
- **Install:** the `/kitchen` page shows a **📥 ติดตั้งแอปพิมพ์ Sunmi** button (via `shouldOfferPrintApp()` — Android + no bridge yet) linking to `/print-app.apk`. Web-only changes just need the app reopened; icon/native changes need a reinstall.
- Details + RawBT/local-bridge alternatives in `docs/sunmi-print.md`.

## Order cancellation

- **Customer** (`/table`) → `POST /api/order-cancel` → `cancelTableOrderFromApi` (public, **guarded**: order must belong to that table token **and** still be `new`).
- **Staff** (`/staff`) cancels via `POST /api/order-status` with `status:"cancelled"` (any not-yet-paid order).
Cancelled orders are excluded from session totals (`recalculateTableSession`).

## Architecture

**Two products in one app:**
1. **Counter POS** (`/`) — staff ring up sales, pick seller, discount, pay. Order `status` is Thai: `"สำเร็จ"` / `"ยกเลิก"`.
2. **QR table ordering** (restaurant flow) — customer scans a table QR (`/table/[token]`), orders land in the kitchen (`/kitchen`) and staff table board (`/staff`). Order `status` is English lifecycle: `new → accepted → cooking → ready → served → payment_requested → paid` (or `cancelled`).

`SUCCESS_STATUSES = ["สำเร็จ", "paid"]` is the bridge — reports/today's-sales count both. When adding a completed-order path, make sure its status lands in this set.

**Rendering pattern:** each `src/app/*/page.tsx` is an **async** server component that `await`s `src/lib/queries.ts` and passes plain data to a `*Client.tsx` component in `src/components/`. Client components mutate through **server actions** in `src/lib/actions.ts` (`"use server"`), which call `revalidatePath(...)` for every affected route. Most pages use `export const dynamic = "force-dynamic"`.

**DB connection** (`src/db/index.ts`): a libSQL client (`@libsql/client` + `drizzle-orm/libsql`) cached on `globalThis`. **All DB access is async** — Drizzle's `.all()`/`.get()`/`.run()` return Promises, so every query is `await`ed and every query/action/service function is `async`; per-row loops use `Promise.all`. When adding a query, `await` it and `await` the function at every caller (incl. `NextResponse.json(await …)` in routes — tsc won't catch a Promise passed to `json()`).

**⚠️ Duplicated write logic — keep in sync.** Restaurant order operations exist twice:
- `src/lib/actions.ts` — server actions used by internal UI (calls `revalidatePath`).
- `src/lib/restaurant-order-service.ts` — plain functions with the *same* logic, used by the public API routes under `src/app/api/` (no revalidation).

`createTableOrder`/`createTableOrderFromApi`, `updateRestaurantOrderStatus(...FromApi)`, `requestTablePayment(...FromApi)`, `confirmTablePayment(...FromApi)` are duplicated. Change one → change the other. **Shared correctness logic now lives in `src/lib/order-ops.ts`** (both files import it): `nextOrderNo`, `applyRecipeStock`, `validateStatusChange` — prefer adding shared logic there.

**Order numbers:** `nextOrderNo()` (`order-ops.ts`) is **atomic** — `UPDATE counters SET value=value+1 … RETURNING` on the `counters` table (`order_no` row) → race-free across devices. `ensureOrderCounter()` (from `ensureSeeded`) initialises the row from the current max. Format `"A" + value`, base 1042.

**Inventory:** both counter sales AND table/QR orders deduct ingredient stock via `applyRecipeStock(items, -1)`; cancelling a table order restores it (`+1`). No recipe = no-op.

**Order status:** `validateStatusChange(current, next)` rejects unknown statuses and any change out of a terminal state (`paid`/`cancelled`) — applied in both `updateRestaurantOrderStatus(...FromApi)`.

**Time zone:** report/day-boundary helpers in `queries.ts` (`startOfToday`/`startOfTomorrow`/`bangkokDayStart`) compute days in **Asia/Bangkok (UTC+7)**, not server-local — Vercel runs UTC, so server-local would flip the day at 07:00 Thai time.

**Inventory:** menus can define recipes (`recipe_items` → `ingredients`). A counter sale deducts ingredient stock via `MAX(0, stock - qty)` (never negative). `queries.ts` computes each product's `makeable` count from stock ÷ recipe.

**Reports** (`getReport()` in `queries.ts`) are computed in JS/JS-Maps, not SQL aggregates — day boundaries via `startOfToday`/`startOfTomorrow`, best-sellers and per-staff sales tallied in memory.

**Denormalization:** orders store `staffName` (and `order_items` store `productName`/`emoji`/`price`) so deleting a staff/product leaves historical bills intact. Preserve this when editing order writes.

## Auth (per-user accounts, hashed passwords)

Login is **username + password per staff member**, not a shared password. Key files:
- **`src/lib/password.ts`** — scrypt hash/verify (`salt:hash`), Node runtime only. **`src/db/schema.ts`** `staff` table carries `username` / `passwordHash` / `role` (`admin` | `staff`); a staff row with no `username` is just a seller name, can't log in.
- **`src/lib/session.ts`** — stateless cookie `pos_session = "<staffId>.<role>.<HMAC-sig>"` signed with `POS_AUTH_TOKEN` via **Web Crypto** (`crypto.subtle`), so `verifySessionCookie()` works in both Edge middleware and Node. Not a JWT; roll your own via these helpers.
- **`src/app/api/login/route.ts`** looks up username → `verifyPassword` → sets the signed cookie. **`src/lib/auth-session.ts`** reads it server-side: `getCurrentRole()` / `getCurrentUser()`.
- **Bootstrap admin:** `ensureAdminAccount()` (in `seed-data.ts`, called from `ensureSeeded`) creates username `admin` with `POS_ADMIN_PASSWORD` **only if no admin exists** — it never resets an existing password. To change a live admin password, update `staff.passwordHash` directly (hash with `password.ts`), not the env var.
- **Admin manages staff logins:** `setStaffLogin` / `removeStaffLogin` in `actions.ts` (guarded by `requireAdmin()`); both refuse to demote/remove the **last admin**. UI is in `SettingsClient.tsx`.

`src/middleware.ts` gates everything via `verifySessionCookie` (async):
- `PUBLIC_PREFIXES` bypass auth — `/table`, `/login`, and customer-facing API routes `/api/table-order`, `/api/payment-request`, `/api/order-cancel`.
- `STAFF_ALLOWED_PREFIXES` — `staff` role gets `/` (counter POS), `/staff`, `/kitchen`, `/help`, `/api/notifications`, order/payment APIs; **admin-only** pages (`/products`, `/orders`, `/reports`, `/expenses`, `/ingredients`, `/settings`) redirect staff to `/staff`. `admin` gets everything. The admin-only list is duplicated in `isAdminOnlyPath()` in `api/login/route.ts` (post-login redirect) — keep both in sync.

Keep the middleware `PUBLIC_PREFIXES` list and any new public route in agreement. (`auth-config.ts` now only exports `bootstrapAdminPassword()`; the old `auth-actions.ts` was deleted.)

## Schema notes (`src/db/schema.ts`)

`settings` is a single row (`id = 1`): `shopName`, `phone`, `address`, `receiptFooter`, `promptPayId`, `serviceChargePct`, `vatPct`. Tables: `products` (incl. `options` JSON + `photo`), `ingredients`, `recipe_items`, `staff` (incl. `username`/`passwordHash`/`role`), `orders`, `order_items`, `expenses`, `restaurant_tables`, `table_sessions`, `payment_requests`. `real` columns hold money (baht). `drizzle.config.ts` dialect is `turso`.

**⚠️ Migrations:** `npm run db:push` is interactive and may prompt to **truncate** a table when adding a `NOT NULL` column (data loss). To add a column without wiping data, run `ALTER TABLE ... ADD COLUMN ...` directly and mirror it in `schema.ts` — **on both DBs**: `sqlite3 sqlite.db "..."` (local) **and** `turso db shell posee-pos "..."` (prod). `db:push` is only safe against a fresh/empty DB.

## Deploy profiles (one codebase, two targets)

The code runs as either **cloud** (Vercel + Turso) or **local/single** (in-shop machine + Tailscale), selected by env — no fork. Differences are gated:
- **`output: "standalone"`** in `next.config.mjs` is enabled only when `process.env.VERCEL` is unset (local build → `node .next/standalone/server.js`; Vercel uses its own adapter). Standalone build must `cp -r .next/static .next/standalone/.next/static` and `cp -r public .next/standalone/public`.
- **`DATABASE_URL`** = `libsql://…turso.io` (+ `DATABASE_AUTH_TOKEN`) on cloud, or `file:sqlite.db` locally.
- **Redirects behind a proxy:** Next standalone sets `request.url` from `HOSTNAME` (`0.0.0.0`), so never build redirect origins from it. Use `publicOrigin(request)` (`src/lib/request-origin.ts`) which reads `x-forwarded-host`/`host`.
- **Build tolerance:** the root layout + `generateMetadata` wrap their DB reads in try/catch (preview builds have no `DATABASE_URL`; self-host first-boot has no tables yet) — don't remove.

## First-run setup & empty seed

The shipped repo has **no shop data**. `ensureSeeded()` (called from `layout.tsx`) only ensures a bare `settings` row (`configured = false`) — it does **not** load the demo menu; that lives in `seedDatabase()` / `npm run db:seed` (dev/demo only).
- `settings.configured` gates first-run: `src/middleware.ts` forces `/setup` until configured, then closes `/setup` (no re-run / account takeover).
- **`/setup`** (`src/app/setup/page.tsx` → `POST /api/setup`) collects shop name, phone, PromptPay, and the owner's admin username + password (min 8, confirmed), writes `settings`, creates the admin, marks `configured`, and logs in.
- **`ensureAdminAccount()`** auto-creates an admin **only** when `POS_ADMIN_PASSWORD` is set (cloud/CI fast-path — also marks configured). No env → the wizard sets a real password. The old `"1234"` fallback is gone (`bootstrapAdminPassword()` returns `""` when unset).

## Staff access mode (`settings.staffAccess`)

`"lan-only"` (default, for local/single) | `"public"`. `src/middleware.ts` (Node runtime — `export const runtime = "nodejs"` so it can read the DB) blocks the staff surface **and `/login`** from non-LAN requests when the effective mode is lan-only.
- **`effectiveStaffAccess(dbValue)`** (`request-origin.ts`) resolves the real mode: `POS_STAFF_ACCESS` env (break-glass, any platform) › on Vercel force `"public"` (no LAN → lan-only would lock everyone out) › else the DB value.
- **`isLanRequest(request)`** is **fail-closed**: LAN only when no `tailscale-*` header, host isn't `*.ts.net`, and the rightmost `x-forwarded-for` is a private/loopback IP. Can't be spoofed through the funnel.
- Customer routes (`/table`, ordering APIs) are always public; `/lan-only` is the info page shown when blocked.

## Security helpers

- **`src/lib/session.ts`** — `sessionSecret()` refuses to operate in production if `POS_AUTH_TOKEN` is unset or a known-weak value (`"local-restaurant-pos-token"`, the dev sentinel). Generate a random token per install (`openssl rand -hex 32`).
- **`src/lib/request-origin.ts`** — `publicOrigin`, `requestIsHttps` (Set-Cookie `Secure` from the real scheme, not `NODE_ENV`, so http-LAN login works), `safeNextPath` (rejects `//host` / scheme open-redirects), `isLanRequest`, `effectiveStaffAccess`.
- **`src/lib/rate-limit.ts`** — in-memory per-instance login throttle (per IP + username). Effective on single/local; **not** on Vercel serverless (multiple lambdas don't share state) — cloud needs a distributed limiter (follow-up).
- **`src/lib/menu-options.ts`** — `priceBand()` / `maxOptionSurcharge()`: the public order API validates each line's unit price against the DB (client prices are untrusted).

**Public order write path** (`createTableOrderFromApi` in `restaurant-order-service.ts`) looks up each product by id, rejects any qty outside 1–99 or unit price outside `[base, base+maxOptions]`, and takes name/emoji from the DB — never trust the client's price.
