-- ============================================================================
-- INTERAKSI Security Hardening — Master Script
-- ============================================================================
-- PERINGATAN: Script ini akan MENGHAPUS semua RLS policy lama dan membuat
-- ulang dengan pengecekan RBAC ketat. Jalankan di Supabase SQL Editor
-- SETELAH supabase_setup.sql dan supabase_auth_roles.sql.
--
-- Urutan eksekusi yang benar:
--   1. supabase_setup.sql          (buat tabel & bucket)
--   2. supabase_auth_roles.sql     (buat profiles & role system)
--   3. supabase_new_features.sql   (buat audit_logs, flags, views)
--   4. supabase_security_hardening.sql  ← INI (kunci semuanya)
-- ============================================================================

-- ============================================================
-- BAGIAN 1: HAPUS SEMUA POLICY LAMA YANG BERBAHAYA
-- ============================================================
-- Kita drop SEMUA policy yang ada agar tidak ada sisa dari setup lama
-- yang menggunakan `using(true)` tanpa pengecekan role.

-- reports
DROP POLICY IF EXISTS "public can insert reports" ON public.reports;
DROP POLICY IF EXISTS "public can read reports" ON public.reports;
DROP POLICY IF EXISTS "authenticated can read reports" ON public.reports;
DROP POLICY IF EXISTS "authenticated can update reports" ON public.reports;
DROP POLICY IF EXISTS "super admin delete reports" ON public.reports;
DROP POLICY IF EXISTS "authenticated can delete reports" ON public.reports;

-- news_posts
DROP POLICY IF EXISTS "public can read news" ON public.news_posts;
DROP POLICY IF EXISTS "authenticated can insert news" ON public.news_posts;
DROP POLICY IF EXISTS "authenticated can update news" ON public.news_posts;
DROP POLICY IF EXISTS "authenticated can delete news" ON public.news_posts;
DROP POLICY IF EXISTS "super admin delete news" ON public.news_posts;

-- audit_logs
DROP POLICY IF EXISTS "authenticated can read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated can insert audit_logs" ON public.audit_logs;

-- moderation_flags
DROP POLICY IF EXISTS "authenticated can read moderation_flags" ON public.moderation_flags;
DROP POLICY IF EXISTS "authenticated can insert moderation_flags" ON public.moderation_flags;
DROP POLICY IF EXISTS "authenticated can update moderation_flags" ON public.moderation_flags;
DROP POLICY IF EXISTS "authenticated can delete moderation_flags" ON public.moderation_flags;
DROP POLICY IF EXISTS "super admin delete moderation_flags" ON public.moderation_flags;

-- storage
DROP POLICY IF EXISTS "public can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "public can read evidence" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete evidence" ON storage.objects;


-- ============================================================
-- BAGIAN 2: PASTIKAN RLS AKTIF DI SEMUA TABEL
-- ============================================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- BAGIAN 3: POLICY BARU — REPORTS (Tabel Laporan)
-- ============================================================

-- 3a. Publik (anon) boleh KIRIM laporan baru
CREATE POLICY "rls_reports_anon_insert"
ON public.reports FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3b. HANYA admin role yang boleh BACA semua laporan
-- (monitoring boleh baca untuk keperluan dashboard read-only)
CREATE POLICY "rls_reports_admin_select"
ON public.reports FOR SELECT
TO authenticated
USING (public.current_user_role() IN ('super_admin', 'admin_redaksi', 'monitoring'));

-- 3c. HANYA super_admin & admin_redaksi yang boleh UPDATE
CREATE POLICY "rls_reports_admin_update"
ON public.reports FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('super_admin', 'admin_redaksi'))
WITH CHECK (public.current_user_role() IN ('super_admin', 'admin_redaksi'));

-- 3d. HANYA super_admin yang boleh DELETE
CREATE POLICY "rls_reports_superadmin_delete"
ON public.reports FOR DELETE
TO authenticated
USING (public.current_user_role() = 'super_admin');


-- ============================================================
-- BAGIAN 4: POLICY BARU — NEWS_POSTS (Tabel Berita)
-- ============================================================

-- 4a. Semua orang (termasuk anon) boleh BACA berita
CREATE POLICY "rls_news_public_select"
ON public.news_posts FOR SELECT
TO anon, authenticated
USING (true);

-- 4b. HANYA super_admin & admin_redaksi boleh INSERT berita baru
CREATE POLICY "rls_news_admin_insert"
ON public.news_posts FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('super_admin', 'admin_redaksi'));

-- 4c. HANYA super_admin & admin_redaksi boleh UPDATE berita
CREATE POLICY "rls_news_admin_update"
ON public.news_posts FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('super_admin', 'admin_redaksi'))
WITH CHECK (public.current_user_role() IN ('super_admin', 'admin_redaksi'));

-- 4d. HANYA super_admin yang boleh DELETE berita
CREATE POLICY "rls_news_superadmin_delete"
ON public.news_posts FOR DELETE
TO authenticated
USING (public.current_user_role() = 'super_admin');


-- ============================================================
-- BAGIAN 5: POLICY BARU — AUDIT_LOGS
-- ============================================================

-- 5a. Semua admin role boleh BACA audit log
CREATE POLICY "rls_audit_admin_select"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.current_user_role() IN ('super_admin', 'admin_redaksi', 'monitoring'));

-- 5b. HANYA super_admin & admin_redaksi boleh INSERT log
-- (monitoring TIDAK boleh menulis log karena mereka read-only)
CREATE POLICY "rls_audit_admin_insert"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('super_admin', 'admin_redaksi'));

-- 5c. TIDAK ADA yang boleh UPDATE atau DELETE audit log
-- (Audit trail harus immutable / tidak bisa diubah)


-- ============================================================
-- BAGIAN 6: POLICY BARU — MODERATION_FLAGS
-- ============================================================

-- 6a. Semua admin role boleh BACA flags
CREATE POLICY "rls_flags_admin_select"
ON public.moderation_flags FOR SELECT
TO authenticated
USING (public.current_user_role() IN ('super_admin', 'admin_redaksi', 'monitoring'));

-- 6b. super_admin & admin_redaksi boleh INSERT flags baru
CREATE POLICY "rls_flags_admin_insert"
ON public.moderation_flags FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('super_admin', 'admin_redaksi'));

-- 6c. super_admin & admin_redaksi boleh UPDATE (resolve) flags
CREATE POLICY "rls_flags_admin_update"
ON public.moderation_flags FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('super_admin', 'admin_redaksi'))
WITH CHECK (public.current_user_role() IN ('super_admin', 'admin_redaksi'));

-- 6d. HANYA super_admin yang boleh DELETE flags
CREATE POLICY "rls_flags_superadmin_delete"
ON public.moderation_flags FOR DELETE
TO authenticated
USING (public.current_user_role() = 'super_admin');


-- ============================================================
-- BAGIAN 7: POLICY BARU — STORAGE (Evidence Bucket)
-- ============================================================

-- 7a. Publik (anon) boleh UPLOAD bukti (untuk form laporan)
CREATE POLICY "rls_storage_public_upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'evidence');

-- 7b. Semua orang boleh BACA/download evidence (bucket public)
CREATE POLICY "rls_storage_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'evidence');

-- 7c. HANYA admin yang boleh DELETE file evidence
-- (Mencegah anon/user biasa menghapus bukti laporan orang lain)
CREATE POLICY "rls_storage_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'evidence'
  AND public.current_user_role() IN ('super_admin', 'admin_redaksi')
);


-- ============================================================
-- BAGIAN 8: CONSTRAINT PANJANG TEKS (Anti-DoS via Data Bomb)
-- ============================================================

-- Hapus constraint lama jika ada
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_description_length;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_whatsapp_length;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_prodi_length;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_name_length;

-- Tambahkan constraint baru
ALTER TABLE public.reports
  ADD CONSTRAINT reports_description_length CHECK (char_length(description) <= 5000);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_whatsapp_length CHECK (char_length(whatsapp) <= 20);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_prodi_length CHECK (char_length(prodi) <= 100);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_name_length CHECK (
    reporter_name IS NULL OR char_length(reporter_name) <= 100
  );

-- Batasi juga news_posts
ALTER TABLE public.news_posts DROP CONSTRAINT IF EXISTS news_title_length;
ALTER TABLE public.news_posts DROP CONSTRAINT IF EXISTS news_content_length;

ALTER TABLE public.news_posts
  ADD CONSTRAINT news_title_length CHECK (char_length(title) <= 300);

ALTER TABLE public.news_posts
  ADD CONSTRAINT news_content_length CHECK (char_length(content) <= 50000);


-- ============================================================
-- BAGIAN 9: RPC FUNCTION UNTUK TRACKING PUBLIK (Lacak Laporan)
-- ============================================================
-- Menghindari akses langsung ke tabel reports oleh anon user.
-- Hanya mengembalikan kolom yang diperlukan untuk halaman /lacak.

CREATE OR REPLACE FUNCTION public.track_report_by_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  category TEXT,
  status TEXT,
  description TEXT,
  additional_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validasi input: minimal 4 karakter, maksimal 10
  IF p_code IS NULL OR char_length(trim(p_code)) < 4 OR char_length(trim(p_code)) > 10 THEN
    RETURN; -- Kembalikan hasil kosong jika input tidak valid
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.category,
    r.status,
    -- Potong deskripsi agar tidak membocorkan terlalu banyak detail
    LEFT(r.description, 200) AS description,
    -- Hanya kembalikan field yang diperlukan dari additional_data
    jsonb_build_object(
      'report_code', r.additional_data->>'report_code',
      'redaksi_note', r.additional_data->>'redaksi_note'
    ) AS additional_data
  FROM public.reports r
  WHERE UPPER(TRIM(r.additional_data->>'report_code')) = UPPER(TRIM(p_code))
  LIMIT 1;
END;
$$;

-- Berikan akses ke anon & authenticated
GRANT EXECUTE ON FUNCTION public.track_report_by_code(TEXT) TO anon, authenticated;


-- ============================================================
-- BAGIAN 10: REVOKE AKSES LANGSUNG ANALYTICS VIEWS DARI ANON
-- ============================================================
-- Analytics view seharusnya hanya bisa diakses oleh admin, bukan publik.

REVOKE SELECT ON public.reports_analytics FROM anon;
REVOKE SELECT ON public.reports_weekly_stats FROM anon;
REVOKE SELECT ON public.reports_by_category FROM anon;

-- Pastikan tetap bisa diakses oleh authenticated (admin)
GRANT SELECT ON public.reports_analytics TO authenticated;
GRANT SELECT ON public.reports_weekly_stats TO authenticated;
GRANT SELECT ON public.reports_by_category TO authenticated;


-- ============================================================
-- RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
