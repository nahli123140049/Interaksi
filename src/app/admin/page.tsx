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

const categoryLabels: Record<string, string> = {
  fasilitas: 'Fasilitas & Infrastruktur',
  akademik: 'Isu Akademik & Birokrasi',
  politik: 'Politik & Organisasi Kampus',
  keamanan: 'Keamanan & Lingkungan'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStatusColumn, setHasStatusColumn] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [statusDraft, setStatusDraft] = useState('pending');
  const [savingStatus, setSavingStatus] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const allowedAdminEmails = useMemo(() => {
    const rawEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';
    return rawEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  const isEmailAllowed = (email?: string | null) => {
    if (!allowedAdminEmails.length) {
      return true;
    }

    return Boolean(email && allowedAdminEmails.includes(email.trim().toLowerCase()));
  };

  const handleUnauthorizedSession = async () => {
    setIsAuthorized(false);
    setIsLoggedIn(false);
    setReports([]);
    setAuthError('Akun ini tidak diizinkan mengakses dashboard admin.');
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
      status: 'pending'
    }));

    setReports(normalizedReports as ReportItem[]);
    setAuthError('Kolom status belum ada. Jalankan ulang SQL setup agar admin bisa update status.');
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
        } else if (session && !authorized) {
          await handleUnauthorizedSession();
        } else {
          setReports([]);
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

  const handleGoogleLogin = async () => {
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined }
    });

    if (error) {
      setAuthError(error.message);
    }
  };

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
    setStatusDraft(report.status ?? 'pending');
  };

  const saveStatus = async () => {
    if (!selectedReport) return;

    setSavingStatus(true);
    setAuthError('');

    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: statusDraft })
        .eq('id', selectedReport.id);

      if (error) {
        throw new Error(error.message);
      }

      setReports((current) =>
        current.map((report) => (report.id === selectedReport.id ? { ...report, status: statusDraft } : report))
      );
      setSelectedReport({ ...selectedReport, status: statusDraft });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal update status laporan.');
    } finally {
      setSavingStatus(false);
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
          <p className="mt-4 text-sm leading-7 text-slate-600">Masuk dengan Google atau Email/Password menggunakan Supabase Auth.</p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Akses dashboard dibatasi ke email admin yang kamu daftar di <span className="font-semibold">NEXT_PUBLIC_ADMIN_EMAILS</span>.
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </div>
          )}

          {authError && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</div>}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Login dengan Google
          </button>

          <div className="my-5 text-center text-xs uppercase tracking-[0.2em] text-slate-400">Atau</div>

          <form className="space-y-4" onSubmit={handleEmailLogin}>
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
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Pantau semua laporan dari tabel reports dan lihat bukti foto unggahan.</p>
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

        {!isAuthorized && (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-800 shadow-soft">
            Akses dashboard belum diizinkan untuk sesi ini. Pastikan email akun login ada di <span className="font-semibold">NEXT_PUBLIC_ADMIN_EMAILS</span>.
          </section>
        )}

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
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Semua data dari Supabase</h2>
            </div>

            <div className="flex items-center gap-3">
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
                    <th className="px-5 py-4 font-semibold">Status Privasi</th>
                    <th className="px-5 py-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {visibleReports.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
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
                    <option value="pending">pending</option>
                    <option value="reviewed">reviewed</option>
                    <option value="resolved">resolved</option>
                  </select>
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
                <InfoRow label="Data Tambahan" value={selectedReport.additional_data ? JSON.stringify(selectedReport.additional_data, null, 2) : '-'} />
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</div>
    </div>
  );
}
