# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** <public repo URL>
- **Live application:** <deployed URL>

## Notes for the reviewer

 **Pre-Seeded Dataset:** The database is pre-seeded with 4 physical locations (Main Warehouse, North Site, Retail Floor A, Retail Floor B), 5 maintained categories, 6 catalog items, 8 weeks of historical ledger transactions, automated item audit logs, and staff notes.
-**One-Click Demo Logins:**The login page (/auth/login) features one-click buttons to instantly switch between the Manager role and different Staff roles with assigned locations.
-**Database Rules:**The PostgreSQL database is protected with append-only triggers that prevent updating or deleting ledger rows, and a stored procedure with row locking (SELECT ... FOR UPDATE) that mathematically prevents negative stock.

## Demo credentials

| Role          | Email               | Password    |
|------         |------               |---------   -|
|Manager        |manager@demo.com     |Password123! |
|Warehouse Staff|staff.main@demo.com  |Password123! |
|Retail Staff   |staff.retail@demo.com|Password123! |
## Stack

| Layer         | What you used                                 | Why |
|-------        |---------------                                |-----|
| Frontend      | Next.js 16 (React 19, App Router, TypeScript) |Server Components for instant rendering, Server Actions for type-safe mutations, and clean accessible styling with zero hydration issues. |

| Backend       |Next.js Server Actions                         |Server-enforced role authentication, location authorization, and zero-boilerplate communication without  separate REST controllers. |

| Database      |Supabase (PostgreSQL 15)                       |Relational integrity, ACID append-only ledger, database triggers for immutability, and PL/pgSQL stored procedures with pessimistic row locking.|

| Authentication| Supabase Auth (@supabase/ssr)                 |Secure, HTTP-only cookie session handling with role verification.

| Hosting       |Vercel (Next.js) & Supabase Cloud (PostgreSQL) |Fast edge deployment, automatic SSL, and managed PostgreSQL infrastructure. |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal                     | Status | Notes |
|---|------                    |--------|-------|
| 1 | Accounts and roles       |Done    |Server-enforced Manager vs. Staff boundaries. Staff cannot create items, locations, or adjustments. |

| 2 | Items and categories     |Done    |Maintained categories list, SKU, name, unit of measure, reorder level CRUD, and soft-archive toggle that preserves history. |

| 3 | Stock movements          |Done    |Receipts (+), Issues (-), Transfers (with source & destination), and Adjustments. Opening an item displays its full movement history in chronological order.|

| 4 | The stock ledger         |Done    |Append-only database triggers block edits/deletes. Balance is derived dynamically from movements. Stored procedure with row locking prevents negative stock. Adjustments require a mandatory reason. |

| 5 | Location assignment      |Done    |Managers assign staff to locations via an interactive matrix. Staff are restricted to recording movements only at their assigned facilities. |

| 6 | Finding items            |Done    |100% server-side text search (SKU/Name), category, location, archive status, and low-stock filtering with multi-column sorting and pagination. |

| 7 | Bulk import and export   |Done    |Bulk item and receipt CSV imports with partial-success reporting and row-by-row error logs. Stock position CSV export. |

| 8 | Dashboard                |Done    |4 live KPI summary cards, stock breakdown by category, location capacity distribution, and 8-week movement volume history. |

| 9 | History you can't rewrite|Done    |Automated field-level mutation audit diffs (old/new value, author, timestamp) and tamper-proof collaborative staff notes timeline. |

| 10 |Low-stock alerts         |Done    |Low-stock alert badge; dismissal tracking; cycle-aware state machine that automatically resurrects alerts when stock is replenished and dips again. |

## How much time did you actually spend?
It took slightly longer than the initial 10–12 hour estimate because this tech stack (Next.js App Router, React 19 Server Components, Supabase SSR cookie handling, and PostgreSQL PL/pgSQL triggers/stored procedures) was new to me. I had to invest extra time reading documentation and debugging PostgreSQL table permissions, RLS policies, and pessimistic row locking (SELECT ... FOR UPDATE) to prevent concurrent inventory race conditions.

## What would you do next, with another 12 hours?
1.**Barcode / QR Code Scanning:** Add mobile camera scanning on /movements/record for rapid warehouse SKU lookup and receipt check-ins.
2.**Automated Supplier Purchase Orders:** Automatically generate draft purchase order PDFs when items enter the low-stock alert state.
3.**Notification Webhooks & Email Digests:** Implement automated daily email alerts or Slack/Discord webhooks for critical low-stock items.

## What are you least happy with in this codebase, and why?
The CSV parser currently uses a custom regex splitter. While it is lightweight, zero-dependency, and handles quoted strings and comma separations well for standard CSV files, supporting deeply nested multiline cells at a 100,000+ row enterprise scale would benefit from a dedicated chunked streaming parser like PapaParse or a background worker queue.