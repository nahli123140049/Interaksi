'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  getAttachmentLabel,
  getReportCategoryTitle,
  getReportSearchText,
  getSlaMeta,
  parseReportAttachments,
  parseReportCode
} from '@/lib/reportUtils';

type PublicReport = {
  id: string;
  created_at: string;
  category: string;
  prodi: string;
  privacy: string;
  description: string;
  evidence_url: string | null;
  status: string;
  additional_data: Record<string, unknown> | null;
};

import { statusMetaMap, getStatusMeta, StatusBadge } from '@/components/StatusBadge';
import { PageShell } from '@/components/PageShell';

const statusOptions = Object.keys(statusMetaMap);

const categoryLabels: Record<string, string> = {
  fasilitas: 'Fasilitas & Infrastruktur',
  akademik: 'Isu Akademik & Birokrasi',
  politik: 'Politik & Organisasi Kampus',
  keamanan: 'Keamanan & Lingkungan',
  lainnya: 'Pelaporan Lainnya'
};

const statusJourney = ['Menunggu Verifikasi', 'Proses Investigasi', 'Arsip Internal', 'Telah Terbit'];

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
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

function formatAdditionalDataLines(data: Record<string, unknown> | null) {
  if (!data) return [] as Array<{ key: string; label: string; value: string }>;

  return Object.entries(data)
    .filter(
      ([key, value]) =>
        key !== 'evidence_urls' &&
        key !== 'uploaded_photo_names' &&
        key !== 'report_code' &&
        key !== 'attachments' &&
        key !== 'redaksi_note' &&
        String(value ?? '').trim().length > 0
    )
    .map(([key, value]) => ({
      key,
      label: additionalDataLabels[key] ?? key.replaceAll('_', ' '),
      value: String(value)
    }));
}

function getRedaksiNote(data: Record<string, unknown> | null) {
  return String(data?.redaksi_note ?? '').trim();
}

function getReportGallery(report: PublicReport) {
  const primary = report.evidence_url ? [report.evidence_url] : [];
  const rawExtra = report.additional_data?.evidence_urls;

  let extra: string[] = [];
  if (Array.isArray(rawExtra)) {
    extra = rawExtra.map((value) => String(value)).filter(Boolean);
  } else if (typeof rawExtra === 'string') {
    try {
      const parsed = JSON.parse(rawExtra);
      if (Array.isArray(parsed)) {
        extra = parsed.map((value) => String(value)).filter(Boolean);
      }
    } catch {
      extra = rawExtra
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return Array.from(new Set([...primary, ...extra]));
}

export default function PublicDashboardPage() {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<PublicReport | null>(null);
  const [showStatusGuideModal, setShowStatusGuideModal] = useState(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);
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
    return reports.filter((report) => {
      const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
      const searchText = getReportSearchText([
        parseReportCode(report.additional_data),
        getReportCategoryTitle(report.category),
        report.prodi,
        report.description,
        report.status,
        report.privacy
      ]);
      const matchesSearch = reportSearch.trim().length === 0 || searchText.includes(reportSearch.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [reports, categoryFilter, reportSearch]);

  const totalReports = useMemo(() => reports.length, [reports]);
  const publishedReports = useMemo(() => reports.filter((report) => report.status === 'Telah Terbit').length, [reports]);
  const verificationQueue = useMemo(
    () => reports.filter((report) => report.status === 'Menunggu Verifikasi' || report.status === 'Proses Investigasi').length,
    [reports]
  );
  const slaOverdueCount = useMemo(() => reports.filter((report) => getSlaMeta(report.created_at, report.status).overdue).length, [reports]);

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
    <PageShell>
      <main className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 dark:text-slate-100 md:px-6 lg:px-10">
        {/* Immersive Background Elements */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-amber-200/20 blur-[120px] dark:bg-amber-900/10" />
          <div className="absolute -right-[5%] top-[20%] h-[600px] w-[600px] rounded-full bg-sky-200/20 blur-[120px] dark:bg-sky-900/10" />
          <div className="absolute bottom-[10%] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-200/10 blur-[120px] dark:bg-emerald-900/5" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:invert" />
        </div>

        <div className="mx-auto max-w-7xl space-y-10">
          <header className="reveal-fade relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/40">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
            
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-1 w-12 rounded-full bg-amber-500" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-500">Dashboard Publik</p>
                </div>
                <h1 className="font-display text-5xl font-bold tracking-tight text-navy-950 dark:text-white md:text-6xl">Aspirasi <span className="text-amber-600">Publik</span></h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                  Transparansi informasi dalam genggaman. Pantau, jelajahi, dan tindak lanjuti aspirasi komunitas kampus secara real-time.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Navigasi dipindahkan ke Navbar untuk tampilan lebih bersih */}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Laporan" value={totalReports} tone="navy" />
              <MetricCard label="Verifikasi" value={verificationQueue} tone="amber" />
              <MetricCard label="Telah Terbit" value={publishedReports} tone="emerald" />
              <MetricCard label="SLA Overdue" value={slaOverdueCount} tone="cyan" />
            </div>
          </header>

          <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
            <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-amber-400/10 blur-[100px]" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-0.5 w-8 bg-cyan-500" />
                <p className="text-[10px] font-black tracking-[0.3em] text-cyan-600 dark:text-cyan-400 uppercase">Eksplorasi Publik</p>
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 dark:text-white md:text-4xl">Data & Informasi <span className="text-cyan-600">Transparansi</span></h2>

              <div className="mt-8 flex flex-wrap gap-2">
                {statusJourney.map((status) => (
                  <span key={status} className="rounded-full border border-white/80 bg-white/50 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-400">
                    {status}
                  </span>
                ))}
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <article className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800/50 dark:from-slate-900/80 dark:to-slate-900/40">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-2xl transition-all group-hover:scale-150" />
                  <div className="relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Pusat Data Aspirasi</p>
                    <h3 className="mt-3 text-2xl font-bold text-navy-950 dark:text-white">Statistik Laporan</h3>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Analisis mendalam mengenai distribusi kategori, status penyelesaian, dan tren aspirasi komunitas kampus.</p>
                    <Link
                      href="/dashboard/pusat-data"
                      className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy-950 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-navy-800 hover:gap-3"
                    >
                      Buka Pusat Data <span className="text-cyan-400">→</span>
                    </Link>
                  </div>
                </article>

                <article className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800/50 dark:from-slate-900/80 dark:to-slate-900/40">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl transition-all group-hover:scale-150" />
                  <div className="relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Berita Terkini</p>
                    <h3 className="mt-3 text-2xl font-bold text-navy-950 dark:text-white">Rilis Investigasi</h3>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Kumpulan berita dan hasil investigasi tim redaksi berdasarkan laporan-laporan publik yang telah divalidasi.</p>
                    <Link
                      href="/dashboard/berita"
                      className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-amber-700 hover:gap-3"
                    >
                      Halaman Berita <span className="text-amber-200">→</span>
                    </Link>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
            <div className="flex flex-col gap-8 border-b border-white/40 dark:border-slate-800/50 pb-10 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-0.5 w-8 bg-amber-500" />
                  <p className="text-[10px] font-black tracking-[0.3em] text-amber-600 dark:text-amber-500 uppercase">Aspirasi Masuk</p>
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 dark:text-white md:text-4xl">Daftar Laporan <span className="text-amber-600">Publik</span></h2>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <input
                    type="search"
                    value={reportSearch}
                    onChange={(event) => setReportSearch(event.target.value)}
                    placeholder="Cari laporan..."
                    className="min-w-[320px] rounded-2xl border border-white/60 bg-white/50 px-6 py-3.5 text-sm text-slate-700 outline-none ring-amber-500/20 focus:border-amber-400 focus:ring-4 backdrop-blur-sm transition-all dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
                  />
                  <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  title="Filter Kategori"
                  className="rounded-2xl border border-white/60 bg-white/50 px-6 py-3.5 text-sm text-slate-700 outline-none ring-amber-500/20 focus:border-amber-400 focus:ring-4 backdrop-blur-sm transition-all dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
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
                  onClick={() => setShowStatusGuideModal(true)}
                  className="rounded-2xl bg-navy-950 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-navy-800 hover:shadow-xl active:scale-95 dark:bg-white dark:text-navy-950"
                >
                  Arti Status
                </button>
              </div>
            </div>

            {loading ? (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                    <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                    <div className="h-20 w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                    <div className="pt-4 flex justify-between">
                      <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                      <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleReports.length === 0 ? (
                  <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-10 text-center md:col-span-2 lg:col-span-3">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada laporan pada filter yang dipilih.</p>
                  </div>
                ) : (
                  visibleReports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => {
                        setSelectedReport(report);
                        setSelectedEvidenceIndex(0);
                      }}
                      className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-8 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-amber-400/50 dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:border-amber-500/30"
                    >
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/0 blur-3xl transition-all group-hover:bg-amber-500/5" />
                      
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{formatDate(report.created_at)}</span>
                          <span className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-500">#{parseReportCode(report.additional_data) || 'NO-ID'}</span>
                        </div>
                        <StatusBadge status={report.status} />
                      </div>
                      
                      <h3 className="font-display text-xl font-bold text-navy-950 dark:text-white line-clamp-1 mb-3 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-500">
                        {categoryLabels[report.category] ?? report.category}
                      </h3>
                      
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3 mb-8">
                        {report.description}
                      </p>
                      
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex -space-x-2">
                          <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 dark:border-slate-900" />
                          <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-300 dark:border-slate-900" />
                        </div>
                        <span className="text-[10px] font-black text-navy-950 dark:text-white uppercase tracking-widest translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">Lihat Detail Laporan <span className="text-amber-500">→</span></span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseTopModal();
            }
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-8 py-6 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-1">Detail Laporan Publik</p>
                <h3 className="font-display text-2xl font-bold text-navy-950 dark:text-white">#{parseReportCode(selectedReport.additional_data) || 'NO-ID'}</h3>
              </div>
              <button
                type="button"
                onClick={() => requestCloseTopModal()}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:text-navy-950 dark:hover:text-white transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-8">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                {/* Column 1: Details */}
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-sm font-bold text-navy-950 dark:text-white">{categoryLabels[selectedReport.category] ?? selectedReport.category}</span>
                      <StatusBadge status={selectedReport.status} />
                    </div>
                    <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedReport.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowStatusGuideModal(true)}
                      className="mt-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 transition hover:border-amber-400 hover:text-amber-600"
                    >
                      Lihat Detail Arti Status
                    </button>
                  </div>

                  <InfoRow label="Program Studi / Unit" value={selectedReport.prodi || '-'} />
                  
                  {getRedaksiNote(selectedReport.additional_data) && (
                    <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20 p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-2">Catatan Redaksi</p>
                      <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 italic">"{getRedaksiNote(selectedReport.additional_data)}"</p>
                    </div>
                  )}

                  <AdditionalDataCard data={selectedReport.additional_data} />
                  <PublicAttachmentPanel attachments={parseReportAttachments(selectedReport.additional_data)} />
                </div>

                {/* Column 2: Gallery & Meta */}
                <div className="space-y-4">
                  <ReportEvidenceCarousel
                    images={getReportGallery(selectedReport)}
                    activeIndex={selectedEvidenceIndex}
                    onChangeIndex={setSelectedEvidenceIndex}
                  />
                  <div className="rounded-2xl bg-navy-50/50 dark:bg-slate-800/50 border border-navy-100 dark:border-slate-800 p-5">
                    <p className="text-xs leading-relaxed text-navy-900/60 dark:text-slate-400 font-medium">
                      Informasi pelapor dijaga kerahasiaannya sesuai kebijakan privasi INTERAKSI. Data yang ditampilkan telah melalui proses verifikasi redaksi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Guide Modal */}
      {showStatusGuideModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseTopModal();
            }
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-8 py-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-1">Panduan Transparansi</p>
                <h3 className="font-display text-2xl font-bold text-navy-950 dark:text-white">Arti Status Laporan</h3>
              </div>
              <button
                type="button"
                onClick={() => requestCloseTopModal()}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:text-navy-950 dark:hover:text-white transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8">
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-black">Status</th>
                      <th className="px-6 py-4 font-black">Penjelasan Alur Aspirasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {statusOptions.map((status) => {
                      const meta = getStatusMeta(status);
                      return (
                        <tr key={status}>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 leading-relaxed max-w-md">{meta.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* --- Sub-Components --- */

function AdditionalDataCard({ data }: { data: Record<string, unknown> | null }) {
  const lines = formatAdditionalDataLines(data);

  if (lines.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/30 p-6 shadow-sm backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-900/30">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-4 rounded-full bg-amber-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Informasi Pendukung</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {lines.map((item) => (
            <div key={item.key} className="flex flex-col gap-1 rounded-xl bg-white/40 p-3 dark:bg-slate-800/30">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/40 bg-white/30 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-900/30">
      <div className="relative flex flex-col gap-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <div className="text-sm font-bold text-navy-950 dark:text-white leading-relaxed">{value}</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'navy' | 'amber' | 'emerald' | 'cyan' }) {
  const toneStyles: Record<'navy' | 'amber' | 'emerald' | 'cyan', { bg: string; text: string; iconBg: string; glow: string }> = {
    navy: { 
      bg: 'bg-gradient-to-br from-navy-900 to-navy-950 dark:from-slate-900 dark:to-slate-950', 
      text: 'text-white', 
      iconBg: 'bg-white/10',
      glow: 'group-hover:shadow-navy-500/20'
    },
    amber: { 
      bg: 'bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700', 
      text: 'text-white', 
      iconBg: 'bg-white/20',
      glow: 'group-hover:shadow-amber-500/30'
    },
    emerald: { 
      bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700', 
      text: 'text-white', 
      iconBg: 'bg-white/20',
      glow: 'group-hover:shadow-emerald-500/30'
    },
    cyan: { 
      bg: 'bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700', 
      text: 'text-white', 
      iconBg: 'bg-white/20',
      glow: 'group-hover:shadow-cyan-500/30'
    }
  };

  const style = toneStyles[tone];

  return (
    <div className={`group relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] shadow-xl ${style.bg} ${style.text} ${style.glow}`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl transition-all group-hover:scale-150" />
      
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${style.iconBg} backdrop-blur-md`}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {tone === 'navy' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
            {tone === 'amber' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {tone === 'emerald' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {tone === 'cyan' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
          </svg>
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black tracking-tight">{value.toLocaleString('id-ID')}</span>
            <span className="text-xs opacity-60 font-bold">Laporan</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportEvidenceCarousel({
  images,
  activeIndex,
  onChangeIndex
}: {
  images: string[];
  activeIndex: number;
  onChangeIndex: (value: number | ((previous: number) => number)) => void;
}) {
  if (images.length === 0) {
    return (
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 aspect-square flex items-center justify-center p-8 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Tidak ada bukti foto yang tersedia.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
        <img 
          src={images[activeIndex]} 
          alt={`Bukti laporan ${activeIndex + 1}`} 
          className="h-full w-full object-contain" 
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onChangeIndex((current) => (current - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-lg transition hover:scale-110"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => onChangeIndex((current) => (current + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-lg transition hover:scale-110"
            >
              →
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => onChangeIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                activeIndex === index ? 'w-8 bg-amber-500' : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PublicAttachmentPanel({ attachments }: { attachments: ReturnType<typeof parseReportAttachments> }) {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Berkas Lampiran</p>
      <div className="grid gap-3">
        {attachments.map((attachment, index) => (
          <div key={`${attachment.url}-${index}`} className="group rounded-[1.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-amber-200 dark:hover:border-amber-900/30">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <div className="truncate">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{getAttachmentLabel(attachment.kind)}</p>
                  <p className="truncate text-xs font-bold text-navy-950 dark:text-slate-200">{attachment.name}</p>
                </div>
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-navy-950 dark:bg-white px-5 py-2 text-[10px] font-black text-white dark:text-navy-950 transition-all hover:scale-105 active:scale-95"
              >
                LIHAT
              </a>
            </div>

            {attachment.kind === 'video' && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                <video controls src={attachment.url} className="w-full aspect-video bg-black" />
              </div>
            )}
            
            {attachment.kind === 'pdf' && (
              <div className="mt-3 flex items-center gap-3 p-4 rounded-xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="text-xs font-medium text-slate-500">Pratinjau PDF tidak tersedia. Gunakan tombol "LIHAT" untuk membuka dokumen.</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
