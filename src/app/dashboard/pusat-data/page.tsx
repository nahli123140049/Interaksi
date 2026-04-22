'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchCategoryStats,
  fetchReportAnalytics,
  fetchWeeklyStats,
  type CategoryStat,
  type ReportAnalytics,
  type WeeklyStat
} from '@/lib/newFeatures';
import { PublicAnalyticsSpotlight } from '@/components/PublicAnalyticsSpotlight';
import { PageShell } from '@/components/PageShell';

function formatWeek(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function PublicAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ReportAnalytics | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [analyticsData, categoriesData, weeklyData] = await Promise.all([
          fetchReportAnalytics(),
          fetchCategoryStats(),
          fetchWeeklyStats()
        ]);

        setAnalytics(analyticsData);
        setCategoryStats(categoriesData);
        setWeeklyStats(weeklyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat pusat data aspirasi.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const compactWeekly = useMemo(() => {
    return weeklyStats.slice(0, 10);
  }, [weeklyStats]);

  return (
    <PageShell>
      <main className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 dark:text-slate-100 md:px-6 lg:px-10">
        {/* Immersive Background Elements */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-cyan-200/20 blur-[120px] dark:bg-cyan-900/10" />
          <div className="absolute -right-[5%] top-[20%] h-[600px] w-[600px] rounded-full bg-navy-200/20 blur-[120px] dark:bg-navy-900/10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:invert" />
        </div>

        <div className="mx-auto max-w-7xl space-y-10">
          <header className="reveal-fade relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/40">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-1 w-12 rounded-full bg-cyan-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Pusat Data Aspirasi</p>
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-navy-950 dark:text-white md:text-6xl">Statistik <span className="text-cyan-600">Transparansi</span></h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                  Pantau volume aspirasi, efektivitas penanganan, dan distribusi isu kampus secara transparan dan akuntabel.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['Real-time', 'Transparan', 'Akuntabel'].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/80 bg-white/50 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-800 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-cyan-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/50 px-6 py-3.5 text-sm font-bold text-slate-700 backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/berita"
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-600/20 transition-all hover:bg-amber-700 hover:scale-105 active:scale-95"
                >
                  Berita Investigasi
                </Link>
              </div>
            </div>
          </header>

          <PublicAnalyticsSpotlight analytics={analytics} categoryStats={categoryStats} isLoading={loading} error={error} />

          <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
            <div className="flex flex-col gap-8 border-b border-white/40 dark:border-slate-800/50 pb-10 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-0.5 w-8 bg-cyan-500" />
                  <p className="text-[10px] font-black tracking-[0.3em] text-cyan-600 dark:text-cyan-400 uppercase">Tren Aktivitas</p>
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 dark:text-white md:text-4xl">Potret <span className="text-cyan-600">Mingguan</span></h2>
              </div>
            </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memproses Data...</p>
            </div>
          ) : compactWeekly.length === 0 ? (
            <div className="mt-10 rounded-[2.5rem] border border-white/40 bg-white/20 p-12 text-center backdrop-blur-sm">
              <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada data tren mingguan yang tersedia saat ini.</p>
            </div>
          ) : (
            <div className="mt-10 overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-2xl backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-900/5 dark:bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-8 py-5 font-black">Minggu</th>
                      <th className="px-8 py-5 font-black">Kategori Isu</th>
                      <th className="px-8 py-5 font-black">Status Akhir</th>
                      <th className="px-8 py-5 text-right font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20 dark:divide-slate-800/50">
                    {compactWeekly.map((row, index) => (
                      <tr key={`${row.week_start}-${row.category}-${row.status}-${index}`} className="group transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                        <td className="px-8 py-5 text-slate-700 dark:text-slate-300 font-medium">{formatWeek(row.week_start)}</td>
                        <td className="px-8 py-5 font-bold text-navy-950 dark:text-white uppercase tracking-tight">{row.category}</td>
                        <td className="px-8 py-5">
                          <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right font-display text-lg font-black text-navy-950 dark:text-white">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
    </PageShell>
  );
}
