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
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-700">Pusat Data Aspirasi</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Transparansi Data Laporan Kampus</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Halaman ini menampilkan statistik laporan yang masuk ke redaksi. Tujuannya agar publik bisa memantau perkembangan data secara terbuka.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-900"
              >
                Kembali ke Dashboard
              </Link>
              <Link
                href="/dashboard/berita"
                className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Lihat Berita Terkini
              </Link>
            </div>
          </div>
        </header>

        <PublicAnalyticsSpotlight analytics={analytics} categoryStats={categoryStats} isLoading={loading} error={error} />

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="border-b border-slate-200/70 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Tren Aktivitas</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Potret mingguan laporan</h2>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-slate-500">Memuat tren mingguan...</div>
          ) : compactWeekly.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Belum ada data tren mingguan.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Minggu</th>
                      <th className="px-4 py-3 font-semibold">Kategori</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {compactWeekly.map((row, index) => (
                      <tr key={`${row.week_start}-${row.category}-${row.status}-${index}`}>
                        <td className="px-4 py-3 text-slate-700">{formatWeek(row.week_start)}</td>
                        <td className="px-4 py-3 text-slate-700">{row.category}</td>
                        <td className="px-4 py-3 text-slate-700">{row.status}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.count}</td>
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
  );
}
