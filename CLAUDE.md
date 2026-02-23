# invoicify — Claude Notes

## Stack
- Next.js 16 (App Router) + TypeScript
- NextAuth v5 (Credentials + GitHub OAuth) — JWT strategy
- Prisma 7 + @prisma/adapter-neon + @neondatabase/serverless (WebSocket pool)
- @react-pdf/renderer v4 — server-side PDF only, NEVER import in 'use client' files
- Dinero.js v2 — all monetary values stored as minor units (sen, cents)
- Shadcn/ui + Tailwind v4
- Resend v4 — email delivery

## Key Conventions

### Monetary Values
- All amounts in the DB are **integer minor units** (e.g. RM 10.50 = 1050)
- `calculateItemAmount(quantity, unitPrice)` = `Math.round((quantity / 100) * unitPrice)`
- `quantity` is stored as `units × 100` (e.g. 1.5 hrs = 150)
- `taxRate` stored as `percentage × 100` (e.g. 9% = 900)
- `formatCurrency(amountMinor, currency)` in `lib/currency.ts` for display

### Invoice Numbering
- `generateInvoiceNumber(userId, tx)` in `lib/invoice-numbering.ts`
- Uses `InvoiceCounter { userId, year, nextValue }` table with atomic upsert+increment
- MUST be called inside a `db.$transaction()` — never outside
- Returns "INV-YYYY-NNN" (e.g. INV-2026-001)

### PDF Generation
- Route: `GET /api/invoices/:id/pdf`
- Component: `components/pdf/InvoicePDF.tsx` — NO 'use client', NO Tailwind classes
- Uses `@react-pdf/renderer` `renderToStream()` — returns ReadableStream
- PDF cached in `pdfUrl` field; invalidated when invoice is edited (set to null)

### Payments
- Payment records are **immutable** — never DELETE
- Reversals use negative-amount rows with `reversalOf` pointing to original payment
- Status auto-progresses: PARTIAL when totalPaid > 0, PAID when totalPaid >= totalAmount

### Auth
- Strategy: JWT (not database sessions) — required for Edge-compatible proxy.ts
- Session carries `user.id` via `token.id` callback
- `types/next-auth.d.ts` augments `Session.user.id` to string

### Prisma 7 Config
- `prisma/config.ts` uses `defineConfig({ schema, datasource: { url: env("DATABASE_URL") } })`
- NO `earlyAccess`, NO `migrate.adapter` — adapter goes in `lib/db.ts`
- Client generated at `app/generated/prisma` — import from `@/app/generated/prisma`
- `lib/db.ts` uses `PrismaNeon({ connectionString })` for WebSocket pool (supports transactions)

## Route Structure
```
app/
  (auth)/          login, register — centered layout, no sidebar
  (app)/           dashboard, clients, invoices, settings — sidebar layout, auth-guarded
  api/
    auth/[...nextauth]  NextAuth handlers
    register            POST create user
    profile             GET/PATCH business profile
    clients/            GET list, POST create
    clients/[id]/       GET, PATCH, DELETE (soft)
    invoices/           GET list (with isOverdue enrichment), POST create
    invoices/[id]/      GET, PATCH
    invoices/[id]/pdf   GET PDF (cached)
    invoices/[id]/payments  POST record payment
    dashboard/summary   GET revenue totals
proxy.ts            Auth guard for /(app) routes
```

## Development
```bash
npx prisma generate    # generate Prisma client after schema changes
npx prisma db push     # push schema to Neon (dev only)
npm run dev            # start dev server
npm run build          # verify no type errors before committing
```

## Pre-Push Checklist
1. `npm run build` — zero type errors
2. Test: create invoice → download PDF → check rendering
3. Test: record payment exceeding total → status auto-transitions to PAID
4. Confirm `InvoiceCounter` increments without gaps (check DB)
