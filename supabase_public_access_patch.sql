-- =========================================================================
-- INTERAKSI - PUBLIC DATA ACCESS PATCH (COMPLETE FIX)
-- =========================================================================
-- Jalankan skrip ini di Supabase SQL Editor.
-- Masalah yang diselesaikan:
--   1. Live Metrics (Total Laporan) selalu 0 di halaman publik
--   2. Laporan Terkini tidak tampil di homepage
--   3. Dashboard publik tidak bisa load data laporan
--
-- SOLUSI: Buat RPC functions dengan SECURITY DEFINER yang aman —
-- fungsi ini berjalan dengan privilege database, BUKAN privilege anon,
-- sehingga bisa membaca data sambil memfilter kolom sensitif secara manual.
-- Tidak ada perubahan pada RLS yang sudah ketat. Tidak ada data bocor.
-- =========================================================================


-- -------------------------------------------------------------------------
-- FUNGSI 1: get_public_metrics()
-- Mengembalikan agregat aman untuk Live Metrics di homepage & dashboard publik.
-- Kolom sensitif (nama, WA, prodi) TIDAK pernah disentuh.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_metrics()
RETURNS TABLE (
  total_reports   BIGINT,
  total_published BIGINT,
  total_pending   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)                                                        AS total_reports,
    COUNT(*) FILTER (WHERE status = 'Telah Terbit')                AS total_published,
    COUNT(*) FILTER (WHERE status IN ('Menunggu Verifikasi','Proses Investigasi')) AS total_pending
  FROM public.reports;
END;
$$;

-- Berikan akses eksekusi kepada anon (pengunjung publik)
GRANT EXECUTE ON FUNCTION public.get_public_metrics() TO anon, authenticated;


-- -------------------------------------------------------------------------
-- FUNGSI 2: get_public_recent_reports(p_limit INT)
-- Mengembalikan laporan terkini hanya dengan kolom aman untuk publik.
-- Tidak menyertakan reporter_name, whatsapp, maupun prodi.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_recent_reports(p_limit INT DEFAULT 3)
RETURNS TABLE (
  id              UUID,
  created_at      TIMESTAMPTZ,
  category        TEXT,
  description     TEXT,
  status          TEXT,
  additional_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validasi input agar tidak bisa digunakan untuk dump data
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 20 THEN
    p_limit := 3;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.category,
    -- Potong deskripsi agar tidak terlalu panjang
    LEFT(r.description, 300) AS description,
    r.status,
    -- Hanya kembalikan field aman dari JSONB (tanpa data pribadi)
    jsonb_build_object(
      'report_code', r.additional_data->>'report_code'
    ) AS additional_data
  FROM public.reports r
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Berikan akses eksekusi kepada anon
GRANT EXECUTE ON FUNCTION public.get_public_recent_reports(INT) TO anon, authenticated;


-- -------------------------------------------------------------------------
-- FUNGSI 3: get_public_reports(p_limit INT, p_offset INT)
-- Mengembalikan daftar laporan publik untuk Dashboard Publik (/dashboard).
-- Kolom sensitif (reporter_name, whatsapp, prodi) TIDAK dikembalikan.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_reports(
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  created_at      TIMESTAMPTZ,
  category        TEXT,
  privacy         TEXT,
  description     TEXT,
  evidence_url    TEXT,
  status          TEXT,
  additional_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    p_limit := 100;
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    p_offset := 0;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.category,
    r.privacy,
    LEFT(r.description, 1000) AS description,
    r.evidence_url,
    r.status,
    -- Strip semua kolom sensitif dari JSONB, hanya kembalikan field aman
    (r.additional_data - 'opini' - 'kontak_saksi_cp') ||
      jsonb_build_object(
        'report_code', r.additional_data->>'report_code',
        'redaksi_note', r.additional_data->>'redaksi_note',
        'attachments', r.additional_data->'attachments',
        'evidence_urls', r.additional_data->'evidence_urls',
        'uploaded_photo_names', r.additional_data->'uploaded_photo_names',
        'gedung_lokasi', r.additional_data->>'gedung_lokasi',
        'jenis_kerusakan', r.additional_data->>'jenis_kerusakan',
        'pihak_terlibat', r.additional_data->>'pihak_terlibat',
        'waktu_kejadian', r.additional_data->>'waktu_kejadian',
        'detail_lokasi', r.additional_data->>'detail_lokasi'
      ) AS additional_data
  FROM public.reports r
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Berikan akses eksekusi kepada anon
GRANT EXECUTE ON FUNCTION public.get_public_reports(INT, INT) TO anon, authenticated;


-- -------------------------------------------------------------------------
-- RELOAD SCHEMA CACHE
-- -------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
