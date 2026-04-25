-- INTERAKSI New Features - Audit Logs, Moderation Flags, and Analytics
-- Run in Supabase SQL Editor

-- 1) Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_email text not null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  description text
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_admin_email on public.audit_logs (admin_email);
create index if not exists idx_audit_logs_table_name on public.audit_logs (table_name);
create index if not exists idx_audit_logs_record_id on public.audit_logs (record_id);

-- RLS for audit_logs
alter table public.audit_logs enable row level security;

drop policy if exists "authenticated can read audit_logs" on public.audit_logs;
create policy "authenticated can read audit_logs"
on public.audit_logs
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert audit_logs" on public.audit_logs;
create policy "authenticated can insert audit_logs"
on public.audit_logs
for insert
to authenticated
with check (true);

-- 2) Moderation Flags Table
create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_id uuid not null references public.reports(id) on delete cascade,
  flag_type text not null,
  priority text not null default 'medium',
  description text,
  created_by text,
  resolved_at timestamptz,
  resolved_by text,
  constraint flag_type_check check (flag_type in ('duplicate', 'priority', 'spam', 'inappropriate', 'low_quality')),
  constraint priority_check check (priority in ('low', 'medium', 'high'))
);

create index if not exists idx_moderation_flags_report_id on public.moderation_flags (report_id);
create index if not exists idx_moderation_flags_flag_type on public.moderation_flags (flag_type);
create index if not exists idx_moderation_flags_priority on public.moderation_flags (priority);
create index if not exists idx_moderation_flags_resolved_at on public.moderation_flags (resolved_at);

-- RLS for moderation_flags
alter table public.moderation_flags enable row level security;

drop policy if exists "authenticated can read moderation_flags" on public.moderation_flags;
create policy "authenticated can read moderation_flags"
on public.moderation_flags
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert moderation_flags" on public.moderation_flags;
create policy "authenticated can insert moderation_flags"
on public.moderation_flags
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update moderation_flags" on public.moderation_flags;
create policy "authenticated can update moderation_flags"
on public.moderation_flags
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete moderation_flags" on public.moderation_flags;
create policy "authenticated can delete moderation_flags"
on public.moderation_flags
for delete
to authenticated
using (true);

-- 3) Analytics View (aggregated stats)
create or replace view public.reports_analytics as
select
  count(*) as total_reports,
  count(*) filter (where status = 'Menunggu Verifikasi') as pending_count,
  count(*) filter (where status = 'Proses Investigasi') as investigating_count,
  count(*) filter (where status = 'Telah Terbit') as published_count,
  count(*) filter (where status = 'Arsip Internal') as archived_count,
  count(*) filter (where status = 'Ditolak/Tidak Valid') as rejected_count,
  count(distinct category) as categories,
  count(distinct prodi) as distinct_prodis,
  max(created_at) as latest_report_at
from public.reports;

-- Grant access
grant select on public.reports_analytics to anon, authenticated;

-- 4) Weekly Analytics (for dashboard metrics)
create or replace view public.reports_weekly_stats as
select
  date_trunc('week', created_at)::date as week_start,
  category,
  status,
  count(*) as count
from public.reports
group by date_trunc('week', created_at), category, status
order by week_start desc, category;

grant select on public.reports_weekly_stats to anon, authenticated;

-- 5) Category Distribution
create or replace view public.reports_by_category as
select
  category,
  status,
  count(*) as count,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as percentage
from public.reports
group by category, status
order by count desc;

grant select on public.reports_by_category to anon, authenticated;

-- Add a column to reports to track if it has pending flags
alter table public.reports add column if not exists has_pending_flags boolean default false;
create index if not exists idx_reports_pending_flags on public.reports (has_pending_flags) where has_pending_flags = true;

-- Fix for Live Metrics: ensure views can count all reports regardless of RLS
alter view if exists public.reports_analytics owner to postgres;
alter view if exists public.reports_weekly_stats owner to postgres;
alter view if exists public.reports_by_category owner to postgres;

notify pgrst, 'reload schema';
