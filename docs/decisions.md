# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

-**Chose:** Next.js(Typescript) single-repository setup.
-**Later reversed:** We initially went with the traditional two-repo split, but quickly realized it would waste too much time on CORS setup, split deployments, and duplicate type definitions. Switching to Next.js combined everything into one codebase and streamlined the entire workflow.
-**Rejected:** Traditional two-repository setup, seperating Node.js/Express backend and React frontend
-**Why:** Putting everything into one repository saved us from wasting time on setting up CORS, managing two different deployments, and writing duplicate data types. It kept the workflow simple and fast. 

## Decision 2

-**Chose:**PostgreSQL via Supabase
-**Rejected:**NoSQL document databases like MongoDB, or a raw PostgreSQL database with a custom ORM (like Prisma/TypeORM).
-**Why:**Inventory and stock control require strict relational integrity, ACID transactions, and precise numerical tracking. NoSQL databases make it difficult to enforce foreign keys and handle simultaneous stock updates safely. Raw DB setups with custom backends add unnecessary boilerplate compared to an instant managed option.

## Decision 3

-**Chose:**Database-level Row Level Security (RLS) via Supabase.
-**Rejected:**Writing manual permission checks inside every individual API route or middleware function.
-**Why:**Requirement 1 mandates that role enforcement happens on the server side. Relying entirely on manual code checks leaves room for human error under pressure. Enforcing security policies directly at the database layer guarantees unauthorized actions are blocked automatically.

## Decision 4

-**Chose:**Dynamic calculation by summing immutable ledger entries (via SQL views or query functions).
-**Rejected:**Storing and directly overwriting a cached quantity column on the product table.
-**Why:**Requirement 4 mandates an append-only ledger and explicitly forbids direct edits. Deriving the current stock dynamically from the sum of receipts, issues, transfers, and adjustments ensures absolute data integrity and a permanent audit trail.

## Decision 5

-**Chose:**Tailwind CSS combined with shadcn/ui components.
-**Rejected:**Writing custom vanilla CSS / CSS Modules or using a heavy pre-styled component library like Material-UI (MUI).
-**Why:**Tailwind and shadcn/ui let us build accessible, clean dashboards rapidly without locking us into a rigid design system or bloating the bundle size with heavy runtime styles.

## Decision 6

-**Chose:**We chose to use the Supabase web dashboard's SQL Editor to set up our database.
-**Rejected:**We initially rejected writing and managing schema definitions through version-controlled local migration files.
-**Later reversed:** We later reversed this approach and switched entirely to local migration files (supabase/migrations/ and supabase/seed.sql) committed directly to our Git repository.
-**Why:**While the SQL Editor allowed for rapid initial prototyping and live testing, it left no version history in Git and made environment reproducibility difficult. Switching to migration files ensured our database schema is fully version-controlled, portable, and transparent for code reviewers to inspect.

## Decision 7

-**Chose:**We chose to use uuid_generate_v4() with an external extension to generate unique IDs for our database tables.
-**Rejected:**We initially rejected native built-in functions because we wanted to follow traditional setup methods found in older tutorials.
-**Later reversed:**We later reversed this approach and switched entirely to using gen_random_uuid() instead. 
-**Why:**uuid_generate_v4() worked fine, it forced us to rely on an extra, external database extension (uuid-ossp). Switching to gen_random_uuid() is built right into modern PostgreSQL by default, which keeps our migration files much cleaner, faster, and free of unnecessary dependencies.

## Decision 5

- **Chose:**
- **Rejected:**
- **Why:**