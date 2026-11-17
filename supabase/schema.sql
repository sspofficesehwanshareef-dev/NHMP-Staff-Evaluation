-- NHMP Staff Evaluation: initial Supabase schema
-- Apply in a NEW Supabase project after departmental approval.
create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','sp','officer');
create type public.vote_rating as enum ('Excellent','Good','Average','Poor');

create table public.units (
 id uuid primary key default gen_random_uuid(),
 name text not null unique
);
insert into public.units(name) values
 ('LHQ / SP Office'),('Beat-01 Petaro'),('Beat-02 Sann'),('Beat-03 Sehwan')
on conflict do nothing;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role public.app_role not null default 'officer',
 unit_id uuid references public.units(id),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 constraint officer_must_have_unit check (role <> 'officer' or unit_id is not null)
);
create table public.staff (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 designation text not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
-- One employee may have multiple dated postings; ranges are inclusive.
create table public.staff_postings (
 id uuid primary key default gen_random_uuid(),
 staff_id uuid not null references public.staff(id) on delete cascade,
 unit_id uuid not null references public.units(id),
 start_date date not null,
 end_date date,
 check (end_date is null or end_date >= start_date)
);
create table public.evaluation_rounds (
 id uuid primary key default gen_random_uuid(),
 evaluation_month date not null unique, -- first day of evaluation month
 start_at timestamptz not null,
 close_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','open','closed')),
 created_by uuid references public.profiles(id),
 check(close_at > start_at)
);
create table public.votes (
 id uuid primary key default gen_random_uuid(),
 round_id uuid not null references public.evaluation_rounds(id) on delete cascade,
 staff_id uuid not null references public.staff(id),
 unit_id uuid not null references public.units(id),
 officer_id uuid not null references public.profiles(id),
 rating public.vote_rating not null,
 updated_at timestamptz not null default now(),
 unique(round_id,staff_id,unit_id,officer_id)
);
create index staff_postings_dates_idx on public.staff_postings(staff_id,start_date,end_date);
create index votes_round_staff_idx on public.votes(round_id,staff_id,unit_id);

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true $$;
create or replace function public.current_unit()
returns uuid language sql stable security definer set search_path=public
as $$ select unit_id from public.profiles where id=auth.uid() and active=true $$;
create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_role() in ('admin','sp'),false) $$;

alter table public.units enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.staff_postings enable row level security;
alter table public.evaluation_rounds enable row level security;
alter table public.votes enable row level security;

create policy "authenticated users can view units" on public.units for select to authenticated using(true);
create policy "users can view own profile; managers view all" on public.profiles for select to authenticated using(id=auth.uid() or public.is_manager());
create policy "managers manage profiles" on public.profiles for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
create policy "staff visible to managers or own-unit officers" on public.staff for select to authenticated using(
 public.is_manager() or exists(select 1 from public.staff_postings p where p.staff_id=staff.id and p.unit_id=public.current_unit())
);
create policy "admins manage staff" on public.staff for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
create policy "postings visible to managers or own unit" on public.staff_postings for select to authenticated using(public.is_manager() or unit_id=public.current_unit());
create policy "admins manage postings" on public.staff_postings for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
create policy "rounds visible to authenticated" on public.evaluation_rounds for select to authenticated using(true);
create policy "admins manage rounds" on public.evaluation_rounds for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');

-- Officers can read only their own votes. SP/admin can inspect officer-identified votes.
create policy "officers own votes managers all votes" on public.votes for select to authenticated using(officer_id=auth.uid() or public.is_manager());
create policy "eligible officers submit own unit votes during open round" on public.votes for insert to authenticated with check(
 officer_id=auth.uid()
 and public.current_role()='officer'
 and unit_id=public.current_unit()
 and exists(select 1 from public.evaluation_rounds r where r.id=round_id and r.status='open' and now() between r.start_at and r.close_at)
 and exists(select 1 from public.staff_postings p where p.staff_id=staff_id and p.unit_id=unit_id
   and p.start_date <= (select (evaluation_month + interval '1 month - 1 day')::date from public.evaluation_rounds where id=round_id)
   and coalesce(p.end_date,'infinity'::date) >= (select evaluation_month from public.evaluation_rounds where id=round_id))
);
create policy "officers update own votes during open round" on public.votes for update to authenticated using(
 officer_id=auth.uid() and public.current_role()='officer'
) with check(
 officer_id=auth.uid() and unit_id=public.current_unit()
 and exists(select 1 from public.evaluation_rounds r where r.id=round_id and r.status='open' and now() between r.start_at and r.close_at)
);
create policy "admins manage votes" on public.votes for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');

-- IMPORTANT:
-- 1) Create the first admin profile manually after creating its Auth user.
-- 2) Do not expose service_role keys in the browser.
-- 3) Production scheduler must update scheduled rounds to open and then closed.
-- 4) Production vote validation should be implemented in a transaction/RPC that
--    creates one vote per officer/staff/unit and calculates posting-day overlap.
-- 5) Review policies with your department's IT/security team before real personnel data.
