@AGENTS.md

# Portx Hub

Invoicing and business management platform for Portx Infotech Private Limited.

## Tech Stack

- **Framework:** Next.js 16 (App Router, `--webpack` mode)
- **UI:** React 19, Tailwind CSS 4, Lucide icons
- **Database:** Firebase Firestore (admin SDK server-side)
- **Auth:** Firebase Auth (client) + JWT verification (middleware)
- **Tables:** TanStack Table v8
- **PDF:** @react-pdf/renderer
- **Email:** Nodemailer via company SMTP (panel.portx.in)

## Project Structure

```
src/
├── app/
│   ├── api/            # API routes (REST)
│   │   ├── auth/       # login, logout, setup
│   │   ├── clients/    # CRUD + [id]
│   │   ├── dashboard/  # aggregated metrics
│   │   ├── expenses/   # CRUD + [id]
│   │   ├── invoices/   # CRUD + [id]/payments + [id]/send-email
│   │   └── settings/   # company settings GET/PUT
│   ├── clients/        # clients page
│   ├── expenses/       # expenses page
│   ├── invoices/       # list, [id] detail, [id]/edit, new
│   ├── login/          # auth page
│   ├── settings/       # company & SMTP settings
│   └── page.tsx        # dashboard
├── components/         # shared UI components
├── lib/                # utilities, Firebase config, types
└── middleware.ts       # JWT auth guard
```

## Key Collections (Firestore)

- `company` (doc: "default") — company info, bank details, SMTP config, invoice numbering
- `clients` — name, contact_name, email, address, GSTIN, currency, is_international
- `invoices` — invoice data with embedded items array, GST calculations
- `payments` — linked to invoices, includes inr_amount for foreign currency
- `expenses` — categorized expenses with GST input credit

## Multi-Currency Support

- INR invoices: CGST/SGST (same state) or IGST (inter-state)
- USD/other invoices: 0% GST (international/export)
- Payments on foreign invoices track `inr_amount` (actual INR received)
- Dashboard shows per-currency revenue breakdown + total INR revenue

## Environment Variables

```
# Firebase Admin (server-side)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Firebase Client (browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

SMTP settings are stored in Firestore (company doc), not env vars.

## Commands

```bash
npm run dev      # dev server (port 3000)
npm run build    # production build
npm run start    # production server
npx tsx scripts/seed.ts              # sample data
npx tsx scripts/migrate-invoices.ts  # import real invoices
```

## Conventions

- All API routes return JSON via NextResponse
- Client components use "use client" directive
- Firestore admin SDK for all server-side data access
- Firebase client SDK only for auth (login page)
- serviceAccountKey.json is gitignored — never commit
- Invoice PDFs generated client-side via @react-pdf/renderer
- Email sends PDF as base64 attachment via Nodemailer
