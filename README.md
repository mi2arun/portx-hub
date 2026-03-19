# Portx Hub

Company management hub for Portx Infotech Private Limited. Portx Hub is a full-stack invoicing and client management application built with Next.js 16 and Firebase, featuring GST-compliant invoice generation, multi-currency support, PDF export, and payment tracking.

## Features

- **Invoice Management** -- Create, edit, and track invoices with auto-generated invoice numbers
- **GST Calculation** -- Automatic CGST, SGST, and IGST computation based on client and company states
- **Multi-Currency Support** -- Issue invoices in different currencies for international clients
- **PDF Generation** -- Download professionally formatted invoice PDFs via `@react-pdf/renderer`
- **Payment Tracking** -- Record payments against invoices with payment mode, reference, and notes
- **Client Management** -- Maintain a client directory with GSTIN, PAN, address, and currency preferences
- **Company Settings** -- Configure company details, bank information, logo, and invoice numbering
- **Firebase Backend** -- Firestore for data persistence and Firebase Auth for secure access
- **Authentication** -- Email/password login with server-side session cookies (JWT via `jose`)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Icons | Lucide React |
| Database | Firebase Firestore |
| Auth | Firebase Auth + server-side sessions |
| PDF | @react-pdf/renderer |
| Admin SDK | firebase-admin |
| Telemetry | @opentelemetry/api |

## Getting Started

### Prerequisites

- Node.js 18.18+ (recommended 20+)
- npm or yarn
- A Firebase project with Firestore and Authentication enabled

### Installation

```bash
git clone https://github.com/your-org/portx-hub.git
cd portx-hub
npm install
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** in production mode
3. Enable **Authentication** with the Email/Password sign-in provider
4. Generate a **Firebase Admin SDK service account key** (Project Settings > Service Accounts > Generate New Private Key) and save the JSON file locally

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Firebase Client (public - used in browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side only)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your-service-account-key.json
```

You can find the `NEXT_PUBLIC_*` values in your Firebase project settings under "Your apps" > Web app config.

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, logout, and setup endpoints
│   │   ├── clients/       # Client CRUD API routes
│   │   ├── invoices/      # Invoice CRUD and payment recording
│   │   └── settings/      # Company settings API
│   ├── clients/           # Client list page
│   ├── invoices/
│   │   ├── new/           # Create invoice page
│   │   └── [id]/          # Invoice detail and edit pages
│   ├── login/             # Login page
│   ├── settings/          # Company settings page
│   ├── layout.tsx         # Root layout with AppShell
│   └── page.tsx           # Invoice dashboard (home)
├── components/
│   ├── AppShell.tsx       # Auth-aware layout wrapper
│   ├── Navbar.tsx         # Top navigation bar
│   ├── ClientForm.tsx     # Client create/edit form
│   ├── InvoiceForm.tsx    # Invoice create/edit form
│   ├── InvoicePDF.tsx     # PDF template for invoices
│   ├── PDFDownloadButton.tsx  # Client-side PDF download trigger
│   └── Skeleton.tsx       # Loading skeleton components
└── lib/
    ├── auth.ts            # Server-side session verification
    ├── firebase-client.ts # Firebase client SDK initialization
    ├── firebase-admin.ts  # Firebase Admin SDK initialization
    ├── gst.ts             # GST calculation logic
    ├── currency.ts        # Currency formatting utilities
    ├── amount-to-words.ts # Number-to-words conversion
    ├── invoice-number.ts  # Invoice number generation
    └── types.ts           # TypeScript type definitions
```

## Deployment

### Vercel (Recommended)

1. Push your repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` to the Vercel project settings
4. For `FIREBASE_SERVICE_ACCOUNT_PATH`, either:
   - Store the service account JSON content in a `FIREBASE_SERVICE_ACCOUNT` environment variable and update `firebase-admin.ts` accordingly, or
   - Use Vercel's file system approach with the JSON bundled in your deployment
5. Deploy -- Vercel will automatically detect Next.js and configure the build

## License

This project is licensed under the [MIT License](LICENSE).
