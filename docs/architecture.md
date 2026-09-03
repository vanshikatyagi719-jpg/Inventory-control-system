# Architecture

Answer each of these, in your own words, once the system has taken real shape.

- What are the moving pieces, and how do they talk to each other?
The system consists of three main components:
1. **Client Browser (Next.js Client Components):**
Renders the interactive forms, operation tabs, search inputs, and CSV file uploaders. It talks to the backend using Next.js Server Actions over standard HTTPS requests.
2. **Application Backend (Next.js App Router & Server Actions):**
Handles server-side rendering, validates user sessions and cookie tokens via @supabase/ssr, enforces user roles (Manager vs. Staff), verifies location permissions, and coordinates queries with the database.
3. **Database (Supabase / PostgreSQL):**
The single source of truth. It stores the tables, relational foreign keys, database triggers that guarantee the ledger cannot be edited or deleted, and the stored procedure (record_stock_movement) with pessimistic row locking (FOR UPDATE) to make sure stock transfers and issues never drive on-hand quantities below zero.

- Where does each piece run?
**Client Browser (User Device)**: Runs the interactive UI (React Client Components), form inputs, tab switching, and CSV file uploaders. It also stores the user's session token in a secure HTTP-only cookie.

**Next.js Server Runtime (Node.js/Edge)**: Runs Server-Side Rendering (SSR), Server Actions (backend logic in actions/), session validation middleware, and role/location permission checks before querying the database.

**Database Engine (Supabase / PostgreSQL Cloud)**: Runs all data storage, database triggers (blocking edits/deletes on the ledger), stored procedures (record_stock_movement with row locking to prevent negative stock), and dynamic calculation views.

**Auth Service (Supabase Auth)**: Runs password verification, password hashing, and issues signed JWT session tokens.

- What is the request path for one representative user action, end to end?

**Example: A staff member records a stock transfer of 20 units from Main Warehouse to Retail Floor A**
1.The user selects the item, source location, destination location, and quantity on /movements/record and clicks Submit.
2.The form calls the server action recordMovementAction in actions/movements.ts.
3.The server action verifies the user's session with supabase.auth.getUser().
4.It checks location_assignments to make sure the staff user is actually assigned to Main Warehouse.
5.The server action calls the PostgreSQL function record_stock_movement(...).
6.Inside PostgreSQL, a transaction starts and locks the item's row (SELECT ... FOR UPDATE) to prevent race conditions from simultaneous requests.
7.The database sums all previous ledger entries for Main Warehouse. If the current balance is less than 20, the transaction aborts with an error.
8.If balance is sufficient, it inserts a single immutable row into stock_movements with movement_type = 'transfer', source Main Warehouse, destination Retail Floor A, and quantity 20.
9.The database commits the transaction and releases the lock.
10.The server action calls revalidatePath(...) for /movements, /items, and / to invalidate cached pages.
11.The browser redirects to the item detail page /items/[id], rendering the updated balances for both locations and the new ledger row.


- What did you decide *not* to build, and why?
1.**A mutable `quantity` column on the items table:**
   I chose not to store a simple editable number for stock. Having an editable quantity makes it easy for numbers to get out of sync with real operations and leaves no audit trail. Instead, stock is calculated directly from the ledger transactions.
2.**Client-side searching and filtering:**
   I avoided downloading the entire product catalog to the browser and filtering with JavaScript. Passing search and filter parameters through URL query strings to the server keeps page loads fast even as the inventory grows.
3.**Heavy third-party charting libraries:**
   Instead of pulling in large charting libraries that increase bundle size and risk hydration mismatches, I built the analytics and 8-week volume timelines using responsive HTML tables and CSS layout cards.