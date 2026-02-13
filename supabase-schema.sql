-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor) to create tables.
-- Then create an admin user: Authentication -> Users -> Add user (email + password).
-- Use that email/password to sign in to the admin portal.
--
-- In Vercel set env vars (Project Settings -> API in Supabase for the key; Project Overview for URL):
--   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
-- The app loads these at runtime from /api/config in production, so no need to rely on build-time inlining.

-- Appointments (public can insert; admin manages via Auth)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  phone text not null,
  email text not null,
  service text not null,
  preferred_date timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','completed')),
  rejection_reason text,
  confirmed_date timestamptz,
  follow_up_notes text,
  created_at timestamptz default now()
);

-- Migration: if you already ran this schema before, run this once to add follow-up:
-- ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS follow_up_notes text;

-- Migration: add return-visit support to revenue (offline patients who will come back):
-- ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS will_visit_back boolean default false;
-- ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS follow_up_notes text;

-- Migration: add source (walk_in vs online) for Recent Transactions display:
-- ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS source text;

-- Revenue (admin only)
create table if not exists public.revenue (
  id uuid primary key default gen_random_uuid(),
  amount integer not null,
  payment_method text not null check (payment_method in ('cash','card','upi')),
  date date not null,
  notes text,
  will_visit_back boolean default false,
  follow_up_notes text,
  source text,
  created_at timestamptz default now()
);

-- RLS: enable
alter table public.appointments enable row level security;    
alter table public.revenue enable row level security;

-- Anyone can insert appointments (booking form)
create policy "Anyone can insert appointments"
  on public.appointments for insert with check (true);

-- Explicitly allow anon role (public booking form uses anon key, no login)
create policy "Allow anon to insert appointments"
  on public.appointments for insert to anon with check (true);

-- Authenticated users (admin) can read/update appointments
create policy "Authenticated can select appointments"
  on public.appointments for select to authenticated using (true);
create policy "Authenticated can update appointments"
  on public.appointments for update to authenticated using (true);

-- Revenue: authenticated only
create policy "Authenticated can manage revenue"
  on public.revenue for all to authenticated using (true);

-- Optional: allow anon to insert so booking works without auth; admin uses Auth to read/update.
-- Already added: "Anyone can insert appointments" with check (true) for insert.
 