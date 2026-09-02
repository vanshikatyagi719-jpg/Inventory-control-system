# Schema

Answer each of these, in your own words.

- Table by table: what columns and types does each one have?
/*1. profiles - for user identification and role based permissions
Attributes -> {id , UUID}, {email , TEXT}, {full name , TEXT}, {role, TEXT}, {created at, TIMESTAMPZ}

2.locations - defines physical locations such as warehouse and other sites.
Attributes -> {id , UUID}, {name , TEXT}, {code, TEXT}, {created at, TIMESTAMPZ}

3.location_assignments- mapping staff to the authorized locations
Attributes -> {user_id , UUID}, {location_id , UUID}

4.categories - groups inventory items by classification
Attributes -> {id, UUID}, {name, TEXT}, {description, TEXT}, {created_at, TIMESTAMPTZ}

5.items - the master catalog of products or hardware
Attributes -> {id, UUID}, {sku, TEXT}, {name, TEXT}, {description, TEXT}, {category_id, UUID}, {unit_of_measure, TEXT}, {reorder_level, NUMERIC}, {is_archived, BOOLEAN}, {created_at, TIMESTAMPTZ}

6.stock_movements - the immutable append-only ledger tracking all stock flows
Attributes -> {id, UUID}, {item_id, UUID}, {movement_type, TEXT}, {quantity, NUMERIC}, {location_id, UUID}, {destination_location_id, UUID}, {adjustment_direction, TEXT}, {reason, TEXT}, {recorded_by, UUID}, {created_at, TIMESTAMPTZ}

item_notes - collaborative notes and logs attached to specific inventory items
Attributes -> {id, UUID}, {item_id, UUID}, {note, TEXT}, {author_id, UUID}, {created_at, TIMESTAMPTZ}
 */
- Which relationships are one-to-many, and which are many-to-many?
/*
One-to-Many Relationships:
1.categories-> items (One category can contain many items).
2.items -> stock_movements (One item can have many historical movement ledger records).
3.locations -> stock_movements (One location can be the source or destination for many movements).4.profiles -> stock_movements (One user can record many stock movements).
5.items -> item_notes (One item can have multiple discussion notes).

Many-to-Many Relationships:
1.profiles <-> locations (Connected via the location_assignments junction table). A single staff member can be assigned to multiple locations, and a location can have multiple staff members assigned to it.
 */

- Which constraints are enforced by the database, and which by application code — and why did you draw the line there?
Enforced by the Database:

Primary & Foreign Keys: Guarantees referential integrity so orphan records cannot exist.

Unique Constraints: Ensures SKUs and location codes remain strictly unique.

Check Constraints: Restricts quantities to positive numbers and limits movement types or adjustment directions to allowed values.

Row Level Security (RLS): Restricts data access and mutations based on user roles and location assignments.

Concurrency & Locking: Uses database-level row locking (FOR UPDATE) to prevent race conditions during concurrent stock updates.

Reason: The database acts as the ultimate, tamper-proof single source of truth. Enforcing these rules here ensures that even if an API or client-side validation is bypassed or buggy, data corruption and unauthorized access remain mathematically impossible at the storage layer.

Enforced by Application Code:

The website code checks if a form field was left blank, trims extra spaces from text, or formats a product code in uppercase before submitting.

Reason: This is for user-friendliness. It gives people instant feedback (like a red error message on their screen) so they can fix typos immediately without waiting around for the server to reply.

- What did you deliberately denormalise?
  
In many databases, people keep a single saved number for each item called current_stock (like storing "15 boxes left") so it's super fast to read. I deliberately chose not to save that number.

I chose to not aligned with the general method rather we can calculate the stock left by adding up all the history entries according to their stock movement action.

- What would break first if this had 100x the data?
If the system suddenly had 100 times more data and traffic, the very first thing to slow down or break would be the live stock balance screen (the dashboard).

Right now, every time the inventory dashboard opened, the database quickly calculates the stock by looking at every single history entry ever recorded.

If the history ledger grows from thousands of rows to tens or hundreds of millions of rows, forcing the database to add and subtract millions of history rows every single time someone loads a page will cause the dashboard to lag, freeze, or time out.