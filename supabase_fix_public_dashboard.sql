-- Fix dashboard publik tidak menampilkan data tanpa login admin
-- Jalankan seluruh script ini di Supabase SQL Editor.

-- 1) Pastikan RLS aktif (policy akan dipakai)
alter table public.reports enable row level security;

-- 1b) Pastikan kategori tambahan diizinkan
alter table public.reports drop constraint if exists reports_category_check;
alter table public.reports add constraint reports_category_check check (category in ('fasilitas', 'akademik', 'politik', 'keamanan', 'lainnya'));
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in ('Menunggu Verifikasi', 'Proses Investigasi', 'Arsip Internal', 'Telah Terbit', 'Ditolak/Tidak Valid'));
alter table public.reports alter column status set default 'Menunggu Verifikasi';

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

-- 6) Berita Terkini
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  summary text,
  content text not null,
  image_urls text[] not null default '{}'
);

grant usage on schema public to anon, authenticated;
grant select on table public.news_posts to anon, authenticated;
grant insert, update, delete on table public.news_posts to authenticated;

notify pgrst, 'reload schema';

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
with check (true);

drop policy if exists "authenticated can update news" on public.news_posts;
create policy "authenticated can update news"
on public.news_posts
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete news" on public.news_posts;
create policy "authenticated can delete news"
on public.news_posts
for delete
to authenticated
using (true);

-- 7) Cek cepat hasil policy aktif
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('reports', 'news_posts')
order by cmd, policyname;
