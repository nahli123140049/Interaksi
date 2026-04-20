'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

type PublicReport = {
  id: string;
  created_at: string;
  category: string;
  prodi: string;
  privacy: string;
  description: string;
  evidence_url: string | null;
  status: string;
  additional_data: Record<string, string> | null;
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

function getStatusMeta(status: string): StatusMeta {
  return statusMetaMap[status] ?? statusMetaMap['Menunggu Verifikasi'];
}

const additionalDataLabels: Record<string, string> = {
  opini: 'Opini / Catatan Redaksi',
  gedung_lokasi: 'Gedung/Lokasi',
  jenis_kerusakan: 'Jenis Kerusakan',
  pihak_terlibat: 'Pihak Terlibat',
  kontak_saksi_cp: 'Kontak Saksi/CP',
  waktu_kejadian: 'Waktu Kejadian',
  detail_lokasi: 'Detail Lokasi'
};

function formatAdditionalDataLines(data: Record<string, string> | null) {
  if (!data) return [] as Array<{ key: string; label: string; value: string }>;

  return Object.entries(data)
    .filter(([key, value]) => key !== 'evidence_urls' && key !== 'uploaded_photo_names' && String(value ?? '').trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: additionalDataLabels[key] ?? key.replaceAll('_', ' '),
      value: String(value)
    }));
}

function getRedaksiNote(data: Record<string, string> | null) {
  return String(data?.redaksi_note ?? '').trim();
}

export default function PublicDashboardPage() {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<PublicReport | null>(null);
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const [showStatusGuideModal, setShowStatusGuideModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const modalDepthRef = useRef(0);

  useEffect(() => {
    const loadReports = async () => {
      if (!isSupabaseConfigured) {
        setError('Sistem belum siap. Silakan coba lagi nanti.');
        setLoading(false);
        return;
      }

      const withStatusResult = await supabase
        .from('reports')
        .select('id, created_at, category, prodi, privacy, description, evidence_url, status, additional_data')
        .order('created_at', { ascending: false });

      if (!withStatusResult.error) {
        setReports((withStatusResult.data ?? []) as PublicReport[]);
        setLoading(false);
        return;
      }

      const missingStatus = /column\s+reports\.status\s+does not exist/i.test(withStatusResult.error.message);
      if (!missingStatus) {
        setError(withStatusResult.error.message);
        setLoading(false);
        return;
      }

      const withoutStatusResult = await supabase
        .from('reports')
        .select('id, created_at, category, prodi, privacy, description, evidence_url, additional_data')
        .order('created_at', { ascending: false });

      if (withoutStatusResult.error) {
        setError(withoutStatusResult.error.message);
        setLoading(false);
        return;
      }

      const normalizedReports = (withoutStatusResult.data ?? []).map((row) => ({
        ...(row as Omit<PublicReport, 'status'>),
        status: 'Menunggu Verifikasi'
      }));

      setReports(normalizedReports as PublicReport[]);
      setError('Ada pembaruan sistem yang belum lengkap. Data tetap bisa dibaca, tetapi beberapa detail pembaruan belum tampil penuh.');
      setLoading(false);
    };

    loadReports();
  }, []);

  const visibleReports = useMemo(() => {
    return reports.filter((report) => categoryFilter === 'all' || report.category === categoryFilter);
  }, [reports, categoryFilter]);

  const closeSelectedReport = useCallback(() => {
    setSelectedReport(null);
  }, []);

  const closeStatusGuideModal = useCallback(() => {
    setShowStatusGuideModal(false);
  }, []);

  const closeTopModal = useCallback(() => {
    if (showStatusGuideModal) {
      closeStatusGuideModal();
      return;
    }

    if (selectedReport) {
      closeSelectedReport();
    }
  }, [closeSelectedReport, closeStatusGuideModal, selectedReport, showStatusGuideModal]);

  const requestCloseTopModal = useCallback(() => {
    if (typeof window !== 'undefined' && modalDepthRef.current > 0) {
      window.history.back();
      return;
    }

    closeTopModal();
  }, [closeTopModal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const modalDepth = Number(Boolean(selectedReport)) + Number(Boolean(showStatusGuideModal));
    const previousDepth = modalDepthRef.current;

    if (modalDepth > previousDepth) {
      const pushCount = modalDepth - previousDepth;
      for (let index = 0; index < pushCount; index += 1) {
        window.history.pushState({ __modal: 'dashboard-modal' }, '', window.location.href);
      }
    }

    modalDepthRef.current = modalDepth;
  }, [selectedReport, showStatusGuideModal]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalDepthRef.current > 0) {
        event.preventDefault();
        requestCloseTopModal();
      }
    };

    const handlePopState = () => {
      if (modalDepthRef.current > 0) {
        closeTopModal();
        modalDepthRef.current = Math.max(0, modalDepthRef.current - 1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeTopModal, requestCloseTopModal]);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">INTERAKSI</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">Ruang Aspirasi Publik</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Jelajahi aspirasi yang masuk, baca isi laporan, dan lihat opini yang ingin dibagikan redaksi tanpa menampilkan identitas pengirim.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
              >
                Beranda
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-full bg-navy-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                Dashboard Admin
              </Link>
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-6 shadow-soft lg:p-8">
          <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-52 w-52 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">Eksplorasi Publik</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Lihat Data dan Berita di Halaman Khusus</h2>
            

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-[1.5rem] border border-cyan-100 bg-white/90 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Pusat Data Aspirasi</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Statistik laporan kampus</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">Lihat total laporan masuk, distribusi kategori, dan insight ringkas transparansi data.</p>
                <Link
                  href="/dashboard/pusat-data"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                >
                  Buka Pusat Data Aspirasi
                </Link>
              </article>

              <article className="rounded-[1.5rem] border border-amber-100 bg-white/90 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Berita Terkini</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Rangkuman berita terbit</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">Akses daftar berita yang sudah dipublikasikan oleh redaksi dalam satu halaman khusus.</p>
                <Link
                  href="/dashboard/berita"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Buka Halaman Berita
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Aspirasi Masuk</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Baca suara yang ingin disampaikan</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                title="Filter Kategori"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
              >
                <option value="all">Semua Kategori</option>
                {Object.entries(categoryLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowStatusGuide((prev) => !prev)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
              >
                {showStatusGuide ? 'Tutup Arti Status' : 'Lihat Arti Status'}
              </button>
              <button
                type="button"
                onClick={() => setShowStatusGuideModal(true)}
                className="rounded-full bg-navy-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
              >
                Detail Arti Status
              </button>
            </div>
          </div>

          {showStatusGuide && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Makna buat Tim Redaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statusOptions.map((status) => {
                    const meta = getStatusMeta(status);
                    return (
                      <tr key={status}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{meta.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Memuat laporan...</div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleReports.length === 0 ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                  Belum ada laporan pada filter yang dipilih.
                </div>
              ) : (
                visibleReports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="text-left rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="space-y-3 text-sm text-slate-700">
                      <div><span className="font-semibold text-slate-900">Waktu:</span> {formatDate(report.created_at)}</div>
                      <div><span className="font-semibold text-slate-900">Status:</span> <StatusBadge status={report.status} /></div>
                      <div><span className="font-semibold text-slate-900">Kategori:</span> {categoryLabels[report.category] ?? report.category}</div>
                      <div>
                        <span className="font-semibold text-slate-900">Isi Aspirasi:</span>
                        <p className="mt-1 leading-6 text-slate-700">{report.description}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Data Tambahan:</span>
                        {formatAdditionalDataLines(report.additional_data).length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {formatAdditionalDataLines(report.additional_data).map((item) => (
                              <div key={item.key} className="text-slate-700">
                                <span className="font-medium text-slate-900">{item.label}:</span> {item.value}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-slate-500">-</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseTopModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-soft lg:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Detail Laporan Publik</p>
                <h3 className="mt-1 text-2xl font-bold text-navy-950">{categoryLabels[selectedReport.category] ?? selectedReport.category}</h3>
              </div>
              <button
                type="button"
                onClick={() => requestCloseTopModal()}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-navy-200 hover:text-navy-900"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <InfoRow label="Waktu" value={formatDate(selectedReport.created_at)} />
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Status</div>
                  <div className="mt-2"><StatusBadge status={selectedReport.status} /></div>
                  <p className="mt-2 text-xs text-slate-500">{getStatusMeta(selectedReport.status).description}</p>
                  <button
                    type="button"
                    onClick={() => setShowStatusGuideModal(true)}
                    className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
                  >
                    Lihat Detail Arti Status
                  </button>
                </div>
                <InfoRow label="Kategori" value={categoryLabels[selectedReport.category] ?? selectedReport.category} />
                <InfoRow label="Isi Aspirasi" value={selectedReport.description} />
                {getRedaksiNote(selectedReport.additional_data) && (
                  <InfoRow label="Catatan Admin/Redaksi" value={getRedaksiNote(selectedReport.additional_data)} />
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
                  Nama pengirim tidak ditampilkan untuk menjaga kerahasiaan.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatusGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseTopModal();
            }
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Panduan Status</p>
                <h3 className="mt-1 text-xl font-bold text-navy-950">Arti Status Laporan</h3>
              </div>
              <button
                type="button"
                onClick={() => requestCloseTopModal()}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-navy-200 hover:text-navy-900"
              >
                Tutup
              </button>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Makna buat Tim Redaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statusOptions.map((status) => {
                    const meta = getStatusMeta(status);
                    return (
                      <tr key={status}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{meta.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function AdditionalDataCard({ data }: { data: Record<string, string> | null }) {
  const lines = formatAdditionalDataLines(data).filter((item) => item.key !== 'redaksi_note');

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

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</div>
    </div>
  );
}
