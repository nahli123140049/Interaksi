-- INTERAKSI Auth Roles Migration
-- Jalankan di Supabase SQL Editor setelah supabase_setup.sql

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'monitoring',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('super_admin', 'admin_redaksi', 'monitoring'))
);

create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_profiles_role on public.profiles (role);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    'monitoring'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.profiles (id, email, full_name, role)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name', au.email),
  'monitoring'
from auth.users au
on conflict (id) do nothing;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'monitoring');
$$;

grant execute on function public.current_user_role() to authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles self update" on public.profiles;

drop policy if exists "super admin read all profiles" on public.profiles;
create policy "super admin read all profiles"
on public.profiles
for select
to authenticated
using (public.current_user_role() = 'super_admin');

drop policy if exists "super admin update all profiles" on public.profiles;
create policy "super admin update all profiles"
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'super_admin')
with check (public.current_user_role() = 'super_admin');

-- Reports
alter table public.reports enable row level security;

drop policy if exists "public can insert reports" on public.reports;
create policy "public can insert reports"
on public.reports
for insert
to anon, authenticated
with check (true);

drop policy if exists "authenticated can read reports" on public.reports;
create policy "authenticated can read reports"
on public.reports
for select
to authenticated
using (public.current_user_role() in ('super_admin', 'admin_redaksi', 'monitoring'));

drop policy if exists "authenticated can update reports" on public.reports;
create policy "authenticated can update reports"
on public.reports
for update
to authenticated
using (public.current_user_role() in ('super_admin', 'admin_redaksi'))
with check (public.current_user_role() in ('super_admin', 'admin_redaksi'));

drop policy if exists "super admin delete reports" on public.reports;
create policy "super admin delete reports"
on public.reports
for delete
to authenticated
using (public.current_user_role() = 'super_admin');

-- News posts
alter table public.news_posts enable row level security;

drop policy if exists "public can read news" on public.news_posts;
create policy "public can read news"
on public.news_posts
for select
to anon, authenticated
using (true);

drop policy if exists "authenticated can insert news" on public.news_posts;
create policy "authenticated can insert news"
on public.news_posts
for insert
to authenticated
with check (public.current_user_role() in ('super_admin', 'admin_redaksi'));

drop policy if exists "authenticated can update news" on public.news_posts;
create policy "authenticated can update news"
on public.news_posts
for update
to authenticated
using (public.current_user_role() in ('super_admin', 'admin_redaksi'))
with check (public.current_user_role() in ('super_admin', 'admin_redaksi'));

drop policy if exists "super admin delete news" on public.news_posts;
create policy "super admin delete news"
on public.news_posts
for delete
to authenticated
using (public.current_user_role() = 'super_admin');

-- Audit logs
alter table public.audit_logs enable row level security;

drop policy if exists "authenticated can read audit_logs" on public.audit_logs;
create policy "authenticated can read audit_logs"
on public.audit_logs
for select
to authenticated
using (public.current_user_role() in ('super_admin', 'admin_redaksi', 'monitoring'));

drop policy if exists "authenticated can insert audit_logs" on public.audit_logs;
create policy "authenticated can insert audit_logs"
on public.audit_logs
for insert
to authenticated
with check (public.current_user_role() in ('super_admin', 'admin_redaksi'));

-- Moderation flags
alter table public.moderation_flags enable row level security;

drop policy if exists "authenticated can read moderation_flags" on public.moderation_flags;
create policy "authenticated can read moderation_flags"
on public.moderation_flags
for select
to authenticated
using (public.current_user_role() in ('super_admin', 'admin_redaksi', 'monitoring'));

drop policy if exists "authenticated can insert moderation_flags" on public.moderation_flags;
create policy "authenticated can insert moderation_flags"
on public.moderation_flags
for insert
to authenticated
with check (public.current_user_role() in ('super_admin', 'admin_redaksi'));

drop policy if exists "authenticated can update moderation_flags" on public.moderation_flags;
create policy "authenticated can update moderation_flags"
on public.moderation_flags
for update
to authenticated
using (public.current_user_role() in ('super_admin', 'admin_redaksi'))
with check (public.current_user_role() in ('super_admin', 'admin_redaksi'));

drop policy if exists "super admin delete moderation_flags" on public.moderation_flags;
create policy "super admin delete moderation_flags"
on public.moderation_flags
for delete
to authenticated
using (public.current_user_role() = 'super_admin');

-- Analytics views remain readable for all authenticated roles

grant select on public.reports_analytics to authenticated;
grant select on public.reports_weekly_stats to authenticated;
grant select on public.reports_by_category to authenticated;

notify pgrst, 'reload schema';
