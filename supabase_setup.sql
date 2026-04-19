-- INTERAKSI Supabase setup
-- Jalankan di Supabase SQL Editor secara berurutan.

-- 1) Table reports
create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null,
  reporter_name text,
  prodi text not null,
  whatsapp text not null,
  privacy text not null,
  description text not null,
  evidence_url text,
  status text not null default 'Menunggu Verifikasi',
  additional_data jsonb not null default '{}'::jsonb,
  constraint reports_category_check check (category in ('fasilitas', 'akademik', 'politik', 'keamanan', 'lainnya')),
  constraint reports_privacy_check check (privacy in ('Publik', 'Rahasiakan Identitas')),
  constraint reports_status_check check (status in ('Menunggu Verifikasi', 'Proses Investigasi', 'Arsip Internal', 'Telah Terbit', 'Ditolak/Tidak Valid'))
);

alter table public.reports drop constraint if exists reports_category_check;
alter table public.reports add constraint reports_category_check check (category in ('fasilitas', 'akademik', 'politik', 'keamanan', 'lainnya'));
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in ('Menunggu Verifikasi', 'Proses Investigasi', 'Arsip Internal', 'Telah Terbit', 'Ditolak/Tidak Valid'));

alter table public.reports add column if not exists status text not null default 'Proses Verifikasi';
alter table public.reports alter column status set default 'Menunggu Verifikasi';

update public.reports
set status = case
  when status in ('pending', 'Proses Verifikasi') then 'Menunggu Verifikasi'
  when status = 'reviewed' then 'Proses Investigasi'
  when status = 'resolved' then 'Telah Terbit'
  when status = 'Diarsipkan' then 'Arsip Internal'
  else 'Menunggu Verifikasi'
end
where status is null or status not in ('Menunggu Verifikasi', 'Proses Investigasi', 'Arsip Internal', 'Telah Terbit', 'Ditolak/Tidak Valid');

create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_reports_category on public.reports (category);

-- 1b) Table news_posts (Berita Terkini)
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

create index if not exists idx_news_posts_created_at on public.news_posts (created_at desc);

-- 2) RLS for reports
alter table public.reports enable row level security;

-- Public user (tanpa login) boleh kirim laporan
drop policy if exists "public can insert reports" on public.reports;
create policy "public can insert reports"
on public.reports
for insert
to anon, authenticated
with check (true);

-- RLS for news_posts
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

-- Hanya user login yang boleh lihat semua laporan (untuk admin dashboard)
drop policy if exists "authenticated can read reports" on public.reports;
create policy "authenticated can read reports"
on public.reports
for select
to authenticated
using (true);

drop policy if exists "public can read reports" on public.reports;
create policy "public can read reports"
on public.reports
for select
to anon, authenticated
using (true);

-- Opsional: kalau nanti admin mau ubah status/tindak lanjut
drop policy if exists "authenticated can update reports" on public.reports;
create policy "authenticated can update reports"
on public.reports
for update
to authenticated
using (true)
with check (true);

-- 3) Storage bucket evidence
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

-- Upload bukti oleh user publik/login
drop policy if exists "public can upload evidence" on storage.objects;
create policy "public can upload evidence"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'evidence');

-- Semua orang bisa baca image bukti (karena bucket public)
drop policy if exists "public can read evidence" on storage.objects;
create policy "public can read evidence"
on storage.objects
for select
to public
using (bucket_id = 'evidence');

-- Opsional: user login boleh hapus file jika dibutuhkan
drop policy if exists "authenticated can delete evidence" on storage.objects;
create policy "authenticated can delete evidence"
on storage.objects
for delete
to authenticated
using (bucket_id = 'evidence');
