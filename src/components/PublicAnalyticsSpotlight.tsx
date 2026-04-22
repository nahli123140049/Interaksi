'use client';

import type { CategoryStat, ReportAnalytics } from '@/lib/newFeatures';

type PublicAnalyticsSpotlightProps = {
  analytics: ReportAnalytics | null;
  categoryStats: CategoryStat[];
  isLoading: boolean;
  error: string;
};

const categoryNameMap: Record<string, string> = {
  fasilitas: 'Fasilitas',
  akademik: 'Akademik',
  politik: 'Politik Kampus',
  keamanan: 'Keamanan',
  lainnya: 'Lainnya'
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function PublicAnalyticsSpotlight({
  analytics,
  categoryStats,
  isLoading,
  error
}: PublicAnalyticsSpotlightProps) {
  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-sm backdrop-blur-md lg:p-12">
        <div className="animate-pulse space-y-8">
          <div className="space-y-3">
            <div className="h-2 w-40 rounded bg-cyan-200/50" />
            <div className="h-10 w-80 max-w-full rounded bg-cyan-200/50" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="h-32 rounded-[2rem] border border-white/40 bg-white/40" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[3rem] border border-rose-200 bg-rose-50/50 p-8 backdrop-blur-md lg:p-12">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-700">Analitik Publik</p>
        <h2 className="mt-4 font-display text-3xl font-bold text-rose-900">Data analitik belum tersedia</h2>
        <p className="mt-4 text-sm leading-7 text-rose-700">{error}</p>
      </section>
    );
  }

  if (!analytics) {
    return (
      <section className="rounded-[3rem] border border-slate-200 bg-white/50 p-8 backdrop-blur-md lg:p-12">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-navy-700">Analitik Publik</p>
        <h2 className="mt-4 font-display text-3xl font-bold text-navy-950">Belum ada data laporan</h2>
      </section>
    );
  }

  const statusCards = [
    {
      label: 'Total Laporan',
      value: analytics.total_reports,
      color: 'cyan',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      label: 'Dalam Proses',
      value: analytics.pending_count + analytics.investigating_count,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      label: 'Telah Terbit',
      value: analytics.published_count,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      label: 'Ditolak/Arsip',
      value: analytics.rejected_count + analytics.archived_count,
      color: 'rose',
      gradient: 'from-rose-500 to-fuchsia-500'
    }
  ];

  const groupedCategories = Object.values(
    categoryStats.reduce<Record<string, { category: string; count: number }>>((acc, row) => {
      if (!acc[row.category]) {
        acc[row.category] = { category: row.category, count: 0 };
      }
      acc[row.category].count += row.count;
      return acc;
    }, {})
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const topCount = groupedCategories[0]?.count ?? 0;

  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-amber-400/10 blur-[100px]" />

      <div className="relative">
        <div className="flex flex-col gap-6 border-b border-white/40 dark:border-slate-800/50 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-0.5 w-8 bg-cyan-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Analitik Utama</p>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 dark:text-white md:text-4xl">Snapshot <span className="text-cyan-600">Transparansi</span></h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Visualisasi volume data pelaporan yang dikelola oleh tim redaksi secara terbuka.
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/50 px-6 py-4 text-right backdrop-blur-sm shadow-sm dark:border-slate-800/50 dark:bg-slate-900/50">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Pembaruan Terakhir</p>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {analytics.latest_report_at ? new Date(analytics.latest_report_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((card) => (
            <article key={card.label} className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/40">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-[0.03]`} />
              <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${card.gradient} mb-6`} />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">{card.label}</p>
              <p className="mt-2 font-display text-4xl font-black text-navy-950 dark:text-white">{formatNumber(card.value)}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-sm backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-1 w-6 rounded-full bg-cyan-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-600">Distribusi Kategori</p>
            </div>
            <div className="space-y-6">
              {groupedCategories.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Data distribusi belum tersedia.</p>
              ) : (
                groupedCategories.map((item) => {
                  const percentage = topCount > 0 ? Math.round((item.count / topCount) * 100) : 0;
                  return (
                    <div key={item.category} className="group">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-bold text-navy-950 dark:text-white uppercase tracking-tight">{categoryNameMap[item.category] ?? item.category}</span>
                        <span className="text-[10px] font-black text-slate-400">{formatNumber(item.count)} LAPORAN</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 transition-all duration-1000 group-hover:saturate-150"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="flex flex-col rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-sm backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-1 w-6 rounded-full bg-amber-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600">Wawasan Cepat</p>
            </div>
            <div className="grid gap-4 flex-1">
              <div className="rounded-2xl bg-white/40 p-4 dark:bg-slate-800/50 border border-white/20">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategori Aktif</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white">{formatNumber(analytics.categories)}</p>
              </div>
              <div className="rounded-2xl bg-white/40 p-4 dark:bg-slate-800/50 border border-white/20">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cakupan Unit/Prodi</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white">{formatNumber(analytics.distinct_prodis)}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4 dark:from-emerald-500/5 dark:to-teal-500/5 border border-emerald-500/20">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Rasio Publikasi</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{analytics.total_reports > 0 ? Math.round((analytics.published_count / analytics.total_reports) * 100) : 0}%</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
