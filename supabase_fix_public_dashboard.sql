-- Fix dashboard publik tidak menampilkan data tanpa login admin
-- Jalankan seluruh script ini di Supabase SQL Editor.

-- 1) Pastikan RLS aktif (policy akan dipakai)
alter table public.reports enable row level security;

-- 2) Hapus semua policy SELECT lama di public.reports
-- Ini mencegah konflik dari policy lama dengan nama berbeda.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.reports', p.policyname);
  end loop;
end
$$;

-- 3) Buat ulang policy SELECT untuk user publik dan login
create policy "public can read reports"
on public.reports
for select
to anon, authenticated
using (true);

-- 4) Pastikan policy INSERT publik tetap ada
-- (agar form submit tetap jalan tanpa login)
drop policy if exists "public can insert reports" on public.reports;
create policy "public can insert reports"
on public.reports
for insert
to anon, authenticated
with check (true);

-- 5) Opsional: update hanya user login (admin)
drop policy if exists "authenticated can update reports" on public.reports;
create policy "authenticated can update reports"
on public.reports
for update
to authenticated
using (true)
with check (true);

-- 6) Cek cepat hasil policy aktif
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'reports'
order by cmd, policyname;
