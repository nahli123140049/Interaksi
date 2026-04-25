-- INTERAKSI Security Fix & Storage Hardening
-- Jalankan di Supabase SQL Editor

-- 1) Menghapus policy lama yang membocorkan data laporan ke publik
-- Policy ini sebelumnya dibuat di supabase_setup.sql dan memungkinkan siapa saja (anon) membaca semua laporan.
drop policy if exists "public can read reports" on public.reports;

-- 2) Pengerasan Keamanan Storage (Evidence Bucket)
-- Membatasi ukuran file dan tipe file yang diperbolehkan di bucket 'evidence'
-- Ini mencegah penyalahgunaan storage oleh pihak tidak bertanggung jawab.

update storage.buckets
set 
  file_size_limit = 5242880, -- 5 MB (dalam bytes)
  allowed_mime_types = '{image/jpeg, image/png, application/pdf}'
where id = 'evidence';

-- 3) Menambahkan policy RLS untuk Storage agar lebih ketat (Opsional tapi disarankan)
-- Meskipun bucket sudah dikonfigurasi, kita bisa memastikan hanya file dengan kriteria tertentu yang masuk lewat RLS.
-- Namun, konfigurasi bucket di atas sudah cukup kuat di level server Supabase Storage.

-- Memastikan policy upload tetap ada tapi bisa kita pertebal jika perlu.
-- Saat ini policy yang ada di supabase_setup.sql adalah:
-- create policy "public can upload evidence" on storage.objects for insert to anon, authenticated with check (bucket_id = 'evidence');

-- Kita bisa menambahkan pengecekan ukuran file di RLS jika ingin lebih parno, 
-- tapi update storage.buckets di atas adalah cara resmi dan termudah dari Supabase.

notify pgrst, 'reload schema';
