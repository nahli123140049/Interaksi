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
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-6 shadow-soft lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded bg-cyan-100" />
          <div className="h-10 w-80 max-w-full rounded bg-cyan-100" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="h-28 rounded-2xl border border-cyan-100 bg-white/80" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-soft lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">Analitik Publik</p>
        <h2 className="mt-2 text-2xl font-bold text-rose-900">Data analitik belum tersedia</h2>
        <p className="mt-3 text-sm leading-7 text-rose-700">{error}</p>
      </section>
    );
  }

  if (!analytics) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Analitik Publik</p>
        <h2 className="mt-2 text-2xl font-bold text-navy-950">Belum ada data laporan untuk ditampilkan</h2>
      </section>
    );
  }

  const statusCards = [
    {
      label: 'Total Laporan Masuk',
      value: analytics.total_reports,
      accentClass: 'from-cyan-500 to-blue-500'
    },
    {
      label: 'Sedang Diproses',
      value: analytics.pending_count + analytics.investigating_count,
      accentClass: 'from-amber-500 to-orange-500'
    },
    {
      label: 'Sudah Terbit',
      value: analytics.published_count,
      accentClass: 'from-emerald-500 to-teal-500'
    },
    {
      label: 'Ditolak / Arsip',
      value: analytics.rejected_count + analytics.archived_count,
      accentClass: 'from-rose-500 to-fuchsia-500'
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
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-6 shadow-soft lg:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-52 w-52 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-cyan-100 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Pusat Data Aspirasi</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Transparansi Laporan Kampus</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Statistik ini ditampilkan untuk publik agar semua orang bisa melihat volume laporan yang sedang dipantau redaksi.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-white/90 px-4 py-3 text-right shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Update terakhir</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {analytics.latest_report_at ? new Date(analytics.latest_report_at).toLocaleString('id-ID') : '-'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((card) => (
            <article key={card.label} className="group rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className={`h-1 w-full rounded-full bg-gradient-to-r ${card.accentClass}`} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{formatNumber(card.value)}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-cyan-100 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Distribusi Kategori Teratas</p>
            <div className="mt-4 space-y-3">
              {groupedCategories.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada distribusi kategori untuk saat ini.</p>
              ) : (
                groupedCategories.map((item) => {
                  const percentage = topCount > 0 ? Math.round((item.count / topCount) * 100) : 0;
                  return (
                    <div key={item.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800">{categoryNameMap[item.category] ?? item.category}</span>
                        <span className="text-slate-600">{formatNumber(item.count)} laporan</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-amber-100 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Ringkasan Cepat</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                Kategori aktif: <span className="font-bold text-slate-900">{formatNumber(analytics.categories)}</span>
              </li>
              <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                Program studi terlapor: <span className="font-bold text-slate-900">{formatNumber(analytics.distinct_prodis)}</span>
              </li>
              <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                Rasio terbit: <span className="font-bold text-slate-900">{analytics.total_reports > 0 ? Math.round((analytics.published_count / analytics.total_reports) * 100) : 0}%</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
