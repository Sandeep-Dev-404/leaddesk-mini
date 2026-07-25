# LeadDesk Mini

A small lead-capture product: a public enquiry page and a protected internal desk
for triaging those enquiries.

**Built for Digital Heroes Training Task** — https://digitalheroesco.com

## Live

- Landing page: https://leaddesk-mini.vercel.app
- Admin: https://leaddesk-mini.vercel.app/admin

### Test credentials
```
Email:    admin@leaddesk.test
Password: Admin@12345
```

## Stack

Next.js (App Router) · TypeScript · TailwindCSS · Prisma · PostgreSQL (Neon) ·
jose (JWT) · bcryptjs · Zod · Vercel

## Data model

```
Lead
  id         cuid, PK
  name       String
  email      String            indexed
  budget     BudgetRange enum  UNDER_1K | ONE_TO_5K | FIVE_TO_15K | ABOVE_15K
  message    String
  status     LeadStatus enum   NEW | CONTACTED | CLOSED, default NEW, indexed
  source     String            default "landing_page"
  createdAt  DateTime          indexed
  updatedAt  DateTime

AdminUser
  id            cuid, PK
  email         String, unique
  passwordHash  String  (bcrypt, 10 rounds)
  createdAt     DateTime
```

**Why enums instead of free-text strings**
`status` and `budget` are closed sets. Making them database enums means an invalid
status can never reach a row, the admin filter is guaranteed exhaustive, and I get
compile-time safety in TypeScript through the generated Prisma types.

**Why `AdminUser` is a separate table from `Lead`**
Leads are untrusted public input. Admins are trusted internal accounts with
credentials. Keeping them in separate tables means there is no path where public
form input can ever touch an authentication row.

**Why `source` exists on day one**
The moment there is a second entry point (an embedded widget, an ads landing page),
the desk needs to know where a lead came from. It is one column now and a painful
backfill later.

## API contract

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/leads` | Public | Create a lead. `201` on success, `422` with per-field errors on validation failure |
| GET | `/api/leads?q=&status=` | Session | List leads, newest first, capped at 200 |
| PATCH | `/api/leads/:id` | Session | Update status. `404` if the lead does not exist |
| POST | `/api/auth/login` | Public | Sets an HTTP-only session cookie |
| POST | `/api/auth/logout` | Public | Clears the cookie |
| GET | `/api/auth/me` | Session | Returns the signed-in admin, `401` if none |

## Auth approach

- Password is hashed with bcrypt (10 rounds). The plaintext is never stored or logged.
- On successful login the server signs a JWT with `jose` containing only `adminId`
  and `email`, expiring in 2 hours.
- The token is set as an **HTTP-only, SameSite=Lax, Secure-in-production cookie**,
  not localStorage. JavaScript on the page cannot read it, which removes the most
  common XSS token-theft path.
- Every protected route calls `getSession()` and verifies the signature server-side
  before touching the database. The client never decides whether it is authorised —
  it only reacts to a `401`.
- Login returns the same generic `Invalid email or password` for a missing account
  and a wrong password, so the endpoint cannot be used to enumerate admin emails.

## Three design decisions

1. **One Zod schema shared by the browser and the server** (`lib/validation.ts`).
   The client gets instant inline errors, the server re-validates the same rules
   because a client can be bypassed with curl. One source of truth, no drift.
2. **Optimistic status updates with rollback.** Toggling a status updates the UI
   immediately and reverts if the PATCH fails. A triage screen is used rapidly;
   waiting on a round trip for every click makes it feel broken.
3. **Debounced search hitting the database, not the client.** Filtering happens in
   Postgres with indexes on `status` and `email`, with a 300ms debounce. Filtering
   an in-memory array would stop working the moment the desk has a few thousand rows.

## Assumptions I made

- The brief did not specify who creates admin accounts, so there is no public admin
  signup. Admins are provisioned through a seed script — an open signup on an internal
  dashboard would be a security hole, not a feature.
- Budget is a fixed set of ranges rather than a free-text number, so leads are
  comparable and filterable later.
- Leads are never hard-deleted from the UI. `CLOSED` is a state, not a deletion.
- The list is capped at 200 rows. Pagination is the obvious next step but was not
  worth the complexity at this data volume.

## Run locally

```bash
git clone https://github.com/Sandeep-Dev-404/leaddesk-mini.git
cd leaddesk-mini
npm install
```

Create `.env`:

```env
DATABASE_URL="postgresql://neondb_owner:npg_KwYLC4T3lshP@ep-polished-pond-ay0myngq-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="f1756a783e6c639e1e7ac44dd030de266452b5b7c56eeca43f031dc18863f0b4"
```

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

## What I would do next with another day

Rate-limiting on `POST /api/leads` (right now a script could flood the desk),
pagination, a notes field per lead, and CSV export.

## Where I used AI

I used Claude and ChatGPT throughout. I used them to get unstuck on the Prisma 7
breaking change around `datasource url` (I downgraded to Prisma 5 after reading
the error), to sanity-check my JWT cookie flags, and to speed up Tailwind class
work on the admin cards. I wrote the data model and the API contract myself, and
I rewrote the generated form handler because the first version validated only on
the client — sharing one Zod schema across both sides was my own change. Every
file in this repo is one I can open and explain line by line.