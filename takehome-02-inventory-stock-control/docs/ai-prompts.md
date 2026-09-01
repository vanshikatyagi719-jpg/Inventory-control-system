# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.


## <I am trying to figure out the best architectural setup and tech stack>

### "I am planning to build an inventory system with an immutable ledger and role-based access within a 12-hour budget using a traditional approach: separate Node.js/Express backend and React frontend repositories. Are there better options, and why should I use them instead of this one?"

### The AI highlighted that a decoupled stack wastes time on CORS, split deployments, and duplicate types, recommending a unified framework instead.

### Refined the general framework advice down to a specific Next.js (TypeScript) single-repo setup to maximize speed and eliminate configuration overhead

## <>


## <I am trying to figure out the best architectural setup and tech stack>

### "Act as a senior full-stack architect. Help me design the system architecture and build plan for an Inventory & Stock Control System using Next.js App Router, TypeScript, and Supabase (PostgreSQL).

Please provide:

System Architecture: Explain the moving pieces, where each component runs (client, Next.js server, Supabase database), and how they communicate. Detail the data flow for an atomic stock movement and server-side filtering.

Build Plan: Outline a logical, step-by-step implementation sequence starting from database DDL and immutability triggers, moving to server actions, and finishing with the UI components and dashboard."

### It gave a clean breakdown of how the client browser, Next.js server, and Supabase database talk to each other, plus a logical build sequence.

### The AI's initial build plan suggested jumping into frontend components a bit too early. I changed the sequence to build and test the PostgreSQL database schema, constraints, and immutability triggers first, before writing any Next.js code. That way, the database rules were locked down from day one.

## <>
