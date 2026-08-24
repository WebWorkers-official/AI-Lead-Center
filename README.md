# AI Lead Command Center

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create your env file:
   ```
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and paste in your real Supabase Project URL and
   anon/public key (found in Supabase → Settings → API Keys).

3. Make sure the `leads` table exists in Supabase (SQL Editor):
   ```sql
   create table leads (
     id uuid default gen_random_uuid() primary key,
     name text not null,
     email text not null,
     company text,
     budget text,
     message text,
     ai_score int,
     ai_category text,
     status text default 'new',
     created_at timestamp with time zone default now()
   );
   ```

4. If Row Level Security (RLS) is enabled on the table, add a policy that
   allows public inserts (safe for a lead form):
   ```sql
   alter table leads enable row level security;

   create policy "Allow public inserts"
   on leads for insert
   to anon
   with check (true);
   ```

5. Run the dev server:
   ```
   npm run dev
   ```

6. Open http://localhost:3000, submit the form, then check
   Supabase → Table Editor → leads to confirm the row landed.
