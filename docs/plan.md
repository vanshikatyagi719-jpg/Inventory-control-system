# Plan

Answer each of these, in your own words.

- How did you break the work into sessions?
**Session 1 (Database Core & Invariants):**
Designed the schema, created PostgreSQL tables, wrote the immutability triggers (`BEFORE UPDATE OR DELETE RAISE EXCEPTION`), created the stored procedure with row-level locking (`FOR UPDATE`), and seeded 8 weeks of demo transaction history.
- **Session 2 (Authentication & Dashboard):**
Configured Supabase SSR cookie handling in Next.js, set up role protection (`manager` vs `staff`), and built the live KPI metrics and category breakdown.
- **Session 3 (Item Catalog & Audit Trail):**
Built the server-side search, category/location/status filters, sorting, pagination, item CRUD, soft-archive toggle, and the automated audit diff timeline with staff notes.
- **Session 4 (Movement Ledger & Location Matrix):**
Created the 4-mode movement form (Receipts, Issues, Transfers, Adjustments), verified atomic transfers and negative stock rejection, and built the staff location assignment matrix.
- **Session 5 (Bulk CSV, Alerts & Final Polish):**
Implemented the CSV item & receipt importer with partial-success error reporting, stock CSV export, cycle-aware alert dismissal machine, and polished the UI.

- What order did you build in, and why that order?
1. **Database Schema & Invariants First:**
I wanted data integrity (append-only ledger, negative stock prevention) locked down at the PostgreSQL level before writing any application code.
2. **Authentication & Roles Second:**
Setting up Manager vs. Staff roles early allowed me to verify permissions natively across every feature as it was built.
3. **Item Catalog Third:**
The product catalog is the central hub of the system; items had to exist before movements could be recorded.
4. **Movement Ledger Fourth:**
Connected the multi-mode movement forms to the database procedure and verified atomic transfers.
5. **Bulk Operations, Alerts & Polish Last:**
Built the bulk CSV tools and alert dismissal state machine on top of the tested foundation.

- What did you estimate versus what it actually took?
**Estimated Time:** 10–12 hours.
**Actual Time:** ~13 hours.
**Variance:** It took slightly longer than estimated because this tech stack (Next.js App Router, React 19 Server Components, Supabase @supabase/ssr cookie authentication, and PostgreSQL PL/pgSQL triggers/stored procedures) was new to me. I had to spend extra time reading documentation and debugging how Server Actions handle session cookies, configuring PostgreSQL two-tier table permissions/RLS policies, and understanding pessimistic row locking (SELECT ... FOR UPDATE) to prevent negative inventory race conditions.

- What did you cut when you ran short?
Because learning the new stack and debugging database permission issues took more time than originally budgeted, I cut external third-party charting libraries (such as Recharts or Chart.js). Instead, I built the analytics cards and 8-week movement volume history using clean, responsive HTML tables and CSS layout cards. This avoided complex chart setup while keeping the application lightweight, fast, and free from hydration mismatches.