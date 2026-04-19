'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type ReportItem = {
  id: string;
  created_at: string;
  category: string;
  reporter_name: string | null;
  prodi: string;
  whatsapp: string;
  privacy: string;
  description: string;
  evidence_url: string | null;
  status: string;
  additional_data: Record<string, string> | null;
};

type NewsItem = {
  id: string;
  created_at: string;
  title: string;
  summary: string | null;
  content: string;
  image_urls: string[] | null;
};

type StatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
};

const statusMetaMap: Record<string, StatusMeta> = {
  'Menunggu Verifikasi': {
    label: 'Menunggu Verifikasi',
    description: 'Laporan baru masuk, belum disentuh.',
    badgeClass: 'border border-amber-200 bg-amber-50 text-amber-800'
  },
  'Proses Investigasi': {
    label: 'Proses Investigasi',
    description: 'Reporter lagi cek lapangan atau wawancara saksi.',
    badgeClass: 'border border-blue-200 bg-blue-50 text-blue-800'
  },
  'Arsip Internal': {
    label: 'Arsip Internal',
    description: 'Valid, tapi cuma buat simpenan data (tidak terbit).',
    badgeClass: 'border border-slate-200 bg-slate-100 text-slate-700'
  },
  'Telah Terbit': {
    label: 'Telah Terbit',
    description: 'Sudah jadi berita di web/IG INTERAKSI.',
    badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-800'
  },
  'Ditolak/Tidak Valid': {
    label: 'Ditolak/Tidak Valid',
    description: 'Laporan ngawur atau tanpa bukti sama sekali.',
    badgeClass: 'border border-rose-200 bg-rose-50 text-rose-800'
  }
};

const statusOptions = Object.keys(statusMetaMap);

const additionalDataLabels: Record<string, string> = {
  opini: 'Opini Pelapor',
  redaksi_note: 'Catatan Admin/Redaksi',
  gedung_lokasi: 'Gedung/Lokasi',
  jenis_kerusakan: 'Jenis Kerusakan',
  pihak_terlibat: 'Pihak Terlibat',
  kontak_saksi_cp: 'Kontak Saksi/CP',
  waktu_kejadian: 'Waktu Kejadian',
  detail_lokasi: 'Detail Lokasi'
};

const categoryLabels: Record<string, string> = {
  fasilitas: 'Fasilitas & Infrastruktur',
  akademik: 'Isu Akademik & Birokrasi',
  politik: 'Politik & Organisasi Kampus',
  keamanan: 'Keamanan & Lingkungan',
  lainnya: 'Pelaporan Lainnya'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function isNewsTableMissingError(message: string) {
  return /relation .*news_posts.* does not exist|Could not find the table 'public.news_posts' in the schema cache/i.test(message);
}

function getStatusMeta(status: string): StatusMeta {
  return statusMetaMap[status] ?? statusMetaMap['Menunggu Verifikasi'];
}

function formatAdditionalDataLines(data: Record<string, string> | null, excludedKeys: string[] = []) {
  if (!data) return [] as Array<{ key: string; label: string; value: string }>;

  return Object.entries(data)
    .filter(([key, value]) => !excludedKeys.includes(key) && String(value ?? '').trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: additionalDataLabels[key] ?? key.replaceAll('_', ' '),
      value: String(value)
    }));
}

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStatusColumn, setHasStatusColumn] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [statusDraft, setStatusDraft] = useState('Menunggu Verifikasi');
  const [redaksiNoteDraft, setRedaksiNoteDraft] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsPhotos, setNewsPhotos] = useState<File[]>([]);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [savingNews, setSavingNews] = useState(false);
  const [deletingNewsId, setDeletingNewsId] = useState<string | null>(null);
  const [newsError, setNewsError] = useState('');
  const [newsMessage, setNewsMessage] = useState('');

  const allowedAdminEmails = useMemo(() => {
    const rawEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';
    return rawEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  const isEmailAllowed = (email?: string | null) => {
    if (!allowedAdminEmails.length) {
      return false;
    }

    return Boolean(email && allowedAdminEmails.includes(email.trim().toLowerCase()));
  };

  const handleUnauthorizedSession = async () => {
    setIsAuthorized(false);
    setIsLoggedIn(false);
    setReports([]);
    if (!allowedAdminEmails.length) {
      setAuthError('Daftar email admin belum dikonfigurasi. Isi NEXT_PUBLIC_ADMIN_EMAILS terlebih dahulu.');
    } else {
      setAuthError('Akun ini tidak diizinkan mengakses dashboard admin.');
    }
    await supabase.auth.signOut();
  };

  const fetchReports = async () => {
    const withStatusResult = await supabase
      .from('reports')
      .select('id, created_at, category, reporter_name, prodi, whatsapp, privacy, description, evidence_url, status, additional_data')
      .order('created_at', { ascending: false });

    if (!withStatusResult.error) {
      setHasStatusColumn(true);
      setReports((withStatusResult.data ?? []) as ReportItem[]);
      return;
    }

    const missingStatus = /column\s+reports\.status\s+does not exist/i.test(withStatusResult.error.message);
    if (!missingStatus) {
      setAuthError(withStatusResult.error.message);
      return;
    }

    setHasStatusColumn(false);
    const withoutStatusResult = await supabase
      .from('reports')
      .select('id, created_at, category, reporter_name, prodi, whatsapp, privacy, description, evidence_url, additional_data')
      .order('created_at', { ascending: false });

    if (withoutStatusResult.error) {
      setAuthError(withoutStatusResult.error.message);
      return;
    }

    const normalizedReports = (withoutStatusResult.data ?? []).map((row) => ({
      ...(row as Omit<ReportItem, 'status'>),
      status: 'Menunggu Verifikasi'
    }));

    setReports(normalizedReports as ReportItem[]);
    setAuthError('Kolom status belum ada. Jalankan ulang SQL setup agar admin bisa update status.');
  };

  const fetchNews = async () => {
    const result = await supabase
      .from('news_posts')
      .select('id, created_at, title, summary, content, image_urls')
      .order('created_at', { ascending: false });

    if (result.error) {
      if (isNewsTableMissingError(result.error.message)) {
        setNewsError('Tabel berita belum tersedia. Jalankan supabase_setup.sql terbaru untuk mengaktifkan Berita Terkini.');
        setNewsItems([]);
        return;
      }

      setNewsError(result.error.message);
      setNewsItems([]);
      return;
    }

    setNewsError('');
    setNewsItems((result.data ?? []) as NewsItem[]);
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const hasSession = Boolean(data.session);
        const email = data.session?.user.email;
        const authorized = hasSession && isEmailAllowed(email);

        setIsLoggedIn(hasSession);
        setIsAuthorized(authorized);

        if (hasSession && authorized) {
          await fetchReports();
          await fetchNews();
        } else if (hasSession && !authorized) {
          await handleUnauthorizedSession();
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Gagal memeriksa sesi admin.');
      } finally {
        if (mounted) {
          setSessionReady(true);
        }
      }
    };

    initialize();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const authorized = Boolean(session) && isEmailAllowed(session?.user.email);
        setIsLoggedIn(Boolean(session));
        setIsAuthorized(authorized);

        if (session && authorized) {
          await fetchReports();
          await fetchNews();
        } else if (session && !authorized) {
          await handleUnauthorizedSession();
        } else {
          setReports([]);
          setNewsItems([]);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Terjadi kesalahan saat sinkronisasi sesi.');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const visibleReports = useMemo(() => {
    if (categoryFilter === 'all') return reports;
    return reports.filter((report) => report.category === categoryFilter);
  }, [categoryFilter, reports]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });

      if (error) {
        setAuthError(error.message);
      } else if (!isEmailAllowed(loginEmail)) {
        await handleUnauthorizedSession();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const openDetail = (report: ReportItem) => {
    setSelectedReport(report);
    setStatusDraft(report.status ?? 'Menunggu Verifikasi');
    setRedaksiNoteDraft(String(report.additional_data?.redaksi_note ?? ''));
  };

  const saveStatus = async () => {
    if (!selectedReport) return;

    setSavingStatus(true);
    setAuthError('');

    try {
      const cleanedStatus = statusDraft.trim();
      const updatedAdditionalData = {
        ...(selectedReport.additional_data ?? {}),
        redaksi_note: redaksiNoteDraft.trim()
      };

      const { error } = await supabase
        .from('reports')
        .update({ status: cleanedStatus, additional_data: updatedAdditionalData })
        .eq('id', selectedReport.id);

      if (error) {
        const detailedMsg = error.message.includes('check constraint')
          ? `${error.message} (Status: "${cleanedStatus}", length: ${cleanedStatus.length})`
          : error.message;
        throw new Error(detailedMsg);
      }

      setReports((current) =>
        current.map((report) =>
          report.id === selectedReport.id
            ? {
                ...report,
                status: cleanedStatus,
                additional_data: updatedAdditionalData
              }
            : report
        )
      );
      setSelectedReport({ ...selectedReport, status: cleanedStatus, additional_data: updatedAdditionalData });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal update status laporan.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCreateNews = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsError('');
    setNewsMessage('');

    if (!newsTitle.trim() || !newsContent.trim()) {
      setNewsError('Judul dan isi berita wajib diisi.');
      return;
    }

    setSavingNews(true);

    try {
      const uploadedUrls: string[] = [];

      for (const photo of newsPhotos) {
        const extension = photo.name.split('.').pop() ?? 'jpg';
        const fileName = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const upload = await supabase.storage.from('evidence').upload(fileName, photo, { upsert: false });

        if (upload.error) {
          throw new Error(`Gagal upload foto berita: ${upload.error.message}`);
        }

        const publicUrl = supabase.storage.from('evidence').getPublicUrl(fileName).data.publicUrl;
        uploadedUrls.push(publicUrl);
      }

      const mergedImageUrls = editingNewsId ? [...existingImageUrls, ...uploadedUrls] : uploadedUrls;

      if (editingNewsId) {
        const update = await supabase
          .from('news_posts')
          .update({
            title: newsTitle.trim(),
            summary: newsSummary.trim() || null,
            content: newsContent.trim(),
            image_urls: mergedImageUrls
          })
          .eq('id', editingNewsId);

        if (update.error) {
          throw new Error(update.error.message);
        }
      } else {
        const insert = await supabase.from('news_posts').insert({
          title: newsTitle.trim(),
          summary: newsSummary.trim() || null,
          content: newsContent.trim(),
          image_urls: mergedImageUrls
        });

        if (insert.error) {
          throw new Error(insert.error.message);
        }
      }

      setNewsTitle('');
      setNewsSummary('');
      setNewsContent('');
      setNewsPhotos([]);
      setEditingNewsId(null);
      setExistingImageUrls([]);
      setNewsMessage(editingNewsId ? 'Berita berhasil diperbarui.' : 'Berita berhasil dipublikasikan.');
      await fetchNews();
    } catch (error) {
      setNewsError(error instanceof Error ? error.message : 'Gagal menambahkan berita.');
    } finally {
      setSavingNews(false);
    }
  };

  const handleEditNews = (news: NewsItem) => {
    setEditingNewsId(news.id);
    setNewsTitle(news.title);
    setNewsSummary(news.summary ?? '');
    setNewsContent(news.content);
    setExistingImageUrls(news.image_urls ?? []);
    setNewsPhotos([]);
    setNewsError('');
    setNewsMessage('Mode edit aktif. Simpan untuk memperbarui berita.');
  };

  const handleCancelEditNews = () => {
    setEditingNewsId(null);
    setNewsTitle('');
    setNewsSummary('');
    setNewsContent('');
    setExistingImageUrls([]);
    setNewsPhotos([]);
    setNewsError('');
    setNewsMessage('');
  };

  const handleDeleteNews = async (newsId: string) => {
    setDeletingNewsId(newsId);
    setNewsError('');
    setNewsMessage('');

    try {
      const remove = await supabase.from('news_posts').delete().eq('id', newsId);

      if (remove.error) {
        throw new Error(remove.error.message);
      }

      setNewsItems((current) => current.filter((item) => item.id !== newsId));
      if (editingNewsId === newsId) {
        handleCancelEditNews();
      }
      setNewsMessage('Berita berhasil dihapus.');
    } catch (error) {
      setNewsError(error instanceof Error ? error.message : 'Gagal menghapus berita.');
    } finally {
      setDeletingNewsId(null);
    }
  };

  if (!sessionReady) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-slate-900">
        <div className="glass-panel rounded-[2rem] px-8 py-10 text-center shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-navy-700">INTERAKSI</p>
          <h1 className="mt-3 text-2xl font-bold text-navy-950">Memeriksa sesi admin...</h1>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10 text-slate-900">
        <section className="glass-panel w-full max-w-lg rounded-[2rem] p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">Admin Access</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-950">Login Admin INTERAKSI</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">Masuk dengan Email/Password.</p>

         

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </div>
          )}

          {authError && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</div>}

          <form className="mt-6 space-y-4" onSubmit={handleEmailLogin}>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="Email admin"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-navy-200 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Memproses login...' : 'Login dengan Email'}
            </button>
          </form>

          <Link href="/" className="mt-4 block text-center text-sm font-semibold text-navy-700 hover:text-navy-900">
            Kembali ke beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">INTERAKSI Admin</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">Dashboard Laporan Mahasiswa</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Pantau laporan, atur status redaksi, isi catatan tindak lanjut, dan terbitkan berita terkini.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
              >
                Beranda
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full bg-navy-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          {authError && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{authError}</div>
          )}

          {!hasStatusColumn && (
            <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Kolom status belum tersedia di tabel reports. Dashboard tetap bisa melihat data, tapi update status perlu SQL migration.
            </div>
          )}

          <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Data Reports</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Semua laporan masuk</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-slate-600">Filter Kategori</label>
              <select
                value={categoryFilter}
                title="Filter Kategori"
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
              >
                <option value="all">Semua</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Timestamp</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Reporter</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Status Privasi</th>
                    <th className="px-5 py-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {visibleReports.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-sm text-slate-500" colSpan={6}>
                        Belum ada laporan untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    visibleReports.map((report) => (
                      <tr key={report.id} className="align-top">
                        <td className="px-5 py-4 text-slate-600">{formatDate(report.created_at)}</td>
                        <td className="px-5 py-4 font-medium text-navy-900">{categoryLabels[report.category] ?? report.category}</td>
                        <td className="px-5 py-4 text-slate-600">
                          <div className="font-medium text-slate-900">{report.reporter_name || 'Anonim'}</div>
                          <div className="text-xs text-slate-500">{report.prodi}</div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-5 py-4 text-slate-600">{report.privacy}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openDetail(report)}
                            className="rounded-full bg-navy-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="border-b border-slate-200/70 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Berita Terkini</p>
            <h2 className="mt-1 text-2xl font-bold text-navy-950">Kelola berita dari hasil laporan</h2>
            {editingNewsId && (
              <p className="mt-2 text-sm text-navy-700">Sedang mengedit berita. Foto baru akan ditambahkan ke galeri yang sudah ada.</p>
            )}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleCreateNews}>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={newsTitle}
                onChange={(event) => setNewsTitle(event.target.value)}
                placeholder="Judul berita"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
              />
              <input
                type="text"
                value={newsSummary}
                onChange={(event) => setNewsSummary(event.target.value)}
                placeholder="Ringkasan berita (opsional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
              />
            </div>

            <textarea
              value={newsContent}
              onChange={(event) => setNewsContent(event.target.value)}
              rows={6}
              placeholder="Isi berita lengkap"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
            />

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Foto Berita (bisa lebih dari satu)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                title="Upload Foto Berita"
                onChange={(event) => setNewsPhotos(Array.from(event.target.files ?? []))}
                className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-navy-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-navy-200"
              />
              {existingImageUrls.length > 0 && (
                <p className="text-xs text-slate-500">Foto tersimpan saat ini: {existingImageUrls.length}</p>
              )}
            </div>

            {newsError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{newsError}</div>}
            {newsMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{newsMessage}</div>}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingNews}
                className="inline-flex items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingNews ? 'Menyimpan berita...' : editingNewsId ? 'Simpan Perubahan Berita' : 'Publikasikan Berita'}
              </button>
              {editingNewsId && (
                <button
                  type="button"
                  onClick={handleCancelEditNews}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {newsItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                Belum ada berita terkini yang dipublikasikan.
              </div>
            ) : (
              newsItems.map((news) => (
                <article key={news.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  {news.image_urls?.[0] && (
                    <img
                      src={news.image_urls[0]}
                      alt={news.title}
                      className="mb-3 h-40 w-full rounded-xl object-cover"
                    />
                  )}
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatDate(news.created_at)}</p>
                  <h3 className="mt-2 text-lg font-bold text-navy-950">{news.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{news.summary || news.content}</p>
                  {news.image_urls && news.image_urls.length > 1 && (
                    <p className="mt-2 text-xs text-slate-500">+{news.image_urls.length - 1} foto tambahan</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditNews(news)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNews(news.id)}
                      disabled={deletingNewsId === news.id}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingNewsId === news.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-soft lg:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Detail Laporan</p>
                <h3 className="mt-1 text-2xl font-bold text-navy-950">{categoryLabels[selectedReport.category] ?? selectedReport.category}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-navy-200 hover:text-navy-900"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <InfoRow label="Timestamp" value={formatDate(selectedReport.created_at)} />
                <InfoRow label="Reporter" value={selectedReport.reporter_name || '-'} />
                <InfoRow label="Program Studi & Angkatan" value={selectedReport.prodi} />
                <InfoRow label="WhatsApp" value={selectedReport.whatsapp} />
                <InfoRow label="Privasi" value={selectedReport.privacy} />
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Status Laporan</div>
                  <select
                    value={statusDraft}
                    title="Status Laporan"
                    onChange={(event) => setStatusDraft(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <StatusBadge status={statusDraft} />
                  </div>

                  <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Catatan Admin/Redaksi</label>
                  <textarea
                    value={redaksiNoteDraft}
                    onChange={(event) => setRedaksiNoteDraft(event.target.value)}
                    rows={4}
                    placeholder="Isi hasil verifikasi, temuan lapangan, atau catatan redaksi yang bisa dilihat user."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                  />

                  <button
                    type="button"
                    onClick={saveStatus}
                    disabled={savingStatus || !hasStatusColumn}
                    className="mt-3 inline-flex rounded-full bg-navy-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {!hasStatusColumn ? 'Status Belum Aktif' : savingStatus ? 'Menyimpan...' : 'Simpan Status'}
                  </button>
                </div>
                <InfoRow label="Deskripsi" value={selectedReport.description} />
                {String(selectedReport.additional_data?.opini ?? '').trim().length > 0 && (
                  <InfoRow label="Opini Pelapor" value={String(selectedReport.additional_data?.opini)} />
                )}
                <AdditionalDataCard data={selectedReport.additional_data} />
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                  {selectedReport.evidence_url ? (
                    <img src={selectedReport.evidence_url} alt="Bukti laporan" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      Tidak ada bukti foto yang diunggah.
                    </div>
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-navy-100 bg-navy-50 p-4 text-sm text-navy-950">
                  Laporan ini disimpan pada tabel reports dan dapat ditindaklanjuti sesuai alur redaksi.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>;
}

function AdditionalDataCard({ data }: { data: Record<string, string> | null }) {
  const lines = formatAdditionalDataLines(data, ['opini', 'redaksi_note']);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Data Tambahan</div>
      {lines.length === 0 ? (
        <div className="mt-1 text-sm leading-6 text-slate-500">-</div>
      ) : (
        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-800">
          {lines.map((item) => (
            <div key={item.key}>
              <span className="font-semibold">{item.label}:</span> {item.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</div>
    </div>
  );
}
