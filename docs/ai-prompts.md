# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.


## <I am trying to figure out the best architectural setup and tech stack>

###"I am planning to build an inventory system with an immutable ledger and role-based access within a 12-hour budget using a traditional approach: separate Node.js/Express backend and React frontend repositories. Are there better options, and why should I use them instead of this one?"

###The AI highlighted that a decoupled stack wastes time on CORS, split deployments, and duplicate types, recommending a unified framework instead.

###Refined the general framework advice down to a specific Next.js (TypeScript) single-repo setup to maximize speed and eliminate configuration overhead

## <>


## <Planning and Implementation roadmap>
###"I need to build an Inventory & Stock Control System covering 10 core requirements (roles, immutable ledger, atomic transfers, catalog search/filters, staff location matrix, bulk CSV imports, audit timelines, and cycle-aware alerts) within a strict time budget. Here is how I am thinking of implementing it:

1.Store an editable 'current_stock' column directly on the items table and update it with simple SQL UPDATE queries whenever stock moves.

2.Check available stock in Node.js memory using an 'if (stock >= requestedQty)' check before deducting.

3.Fetch all catalog items to the frontend React state and do client-side filtering and pagination using JavaScript array methods.

4.Build the frontend UI screens first, then connect the backend routes later.
What is your opinion on this approach, and are there better ways to build this reliably?"

### The AI evaluated the proposed plan and pointed out critical vulnerabilities:
1. A mutable 'current_stock' column breaks auditability and allows stock to drift out of sync during failed operations.
2. Checking stock in Node.js memory creates race conditions under concurrent requests, which can result in negative inventory.
3. Client-side filtering slows down as catalog data grows.
4. Building UI first risks mismatching frontend forms with database constraints.

*The AI suggested four better, production-grade options:*
1.An Append-Only Ledger where stock is dynamically calculated from immutable transaction entries.
2.A PostgreSQL PL/pgSQL stored procedure using pessimistic row locking ('SELECT ... FOR UPDATE') to prevent negative stock at the database engine level.
3.Server-side URL parameter filtering ('searchParams') for instant, scalable catalog searches and bookmarkable pages.
4.A 'Database Invariants First' build order so data integrity rules are enforced before developing frontend components.

###I adopted the AI's recommendations for the append-only ledger, database row locking, and server-side filtering. I structured the project roadmap to build and verify the database schema and immutability triggers first, which prevented concurrency bugs and ensured our data rules were locked down from day one.
## <>

## <Database Schema, Immutability Triggers & UUID function debugging>

###"Design the PostgreSQL schema for the append-only stock ledger, audit diff triggers, and a stored procedure for atomic stock movements that prevents race conditions and negative inventory."

###The AI generated SQL DDL with immutability triggers, item audit log diff triggers, and the record_stock_movement PL/pgSQL function using uuid_generate_v4() for primary keys.

###Running the migration produced an error stating that uuid_generate_v4() does not exist because the uuid-ossp extension was missing. I replaced all instances with PostgreSQL's built-in gen_random_uuid() function to remove external extension dependencies and ensure clean migration execution.
## <>


## <Resolving PostgREST Foreign Key Relationship Join Errors>

###"Why is Supabase PostgREST failing with 'Could not find a relationship between stock_movements and locations in the schema cache' when joining relations, and what is the most resilient way to fetch enriched relation data in Next.js Server Actions?"

###The AI suggested using explicit constraint name hints like locations!stock_movements_location_id_fkey in the query string.

###The constraint aliases proved fragile and broke when constraint names differed. I replaced the nested joins with direct queries batch-enriched in JavaScript using in(...) lookups and Hash Maps for items, locations, and user profiles, making data fetching 100% resilient against schema naming variations.
## <>

## <Fixing React 19 Style Shorthand Conflict Warning>

###"Fix the Turbopack console warning on the executive dashboard: Updating a style property during rerender (border) when a conflicting property is set (borderLeft) can lead to styling bugs."

###The AI explained that React 19 warns when mixing shorthand properties like 'border' with specific side properties like 'borderLeft' on the same element during re-renders.

###I refactored the kpiCardStyle object to specify the explicit individual sides (borderTop, borderRight, borderBottom) so that adding borderLeft with distinctive colors on each KPI card eliminated the console warning completely.
## <>

## <Alert Dismissal Column Mapping & Cycle-Aware Resurrection Logic>

###"The dismiss alert action is failing to insert a row into alert_dismissals. Align the action payload with the database schema and ensure dismissed alerts automatically resurrect when stock is replenished above reorder level and drops again."
###The AI identified a column name mismatch between the form payload and the database table, and provided a chronological state machine algorithm to compare movement timestamps against dismissal timestamps.
###I corrected the payload keys to match 'dismissed_by' and 'stock_at_dismissal' in actions/alerts.ts, and verified that when stock is restocked above reorder level and subsequently drops in a new cycle, the alert automatically resurrects for user review.
## <>