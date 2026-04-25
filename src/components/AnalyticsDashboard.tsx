'use client';

import { useState, useEffect } from 'react';
import type { ReportAnalytics, WeeklyStat, CategoryStat } from '@/lib/newFeatures';

interface AnalyticsDashboardProps {
  analytics: ReportAnalytics | null;
  weeklyStats: WeeklyStat[];
  categoryStats: CategoryStat[];
}

export function AnalyticsDashboard({
  analytics,
  weeklyStats,
  categoryStats
}: AnalyticsDashboardProps) {
  if (!analytics) return null;

  const statCards = [
    { label: 'Total Laporan', value: analytics.total_reports, color: 'bg-blue-50 border-blue-200' },
    { label: 'Menunggu Verifikasi', value: analytics.pending_count, color: 'bg-amber-50 border-amber-200' },
    { label: 'Proses Investigasi', value: analytics.investigating_count, color: 'bg-purple-50 border-purple-200' },
    { label: 'Telah Terbit', value: analytics.published_count, color: 'bg-emerald-50 border-emerald-200' },
    { label: 'Ditolak', value: analytics.rejected_count, color: 'bg-rose-50 border-rose-200' },
    { label: 'Diarsipkan', value: analytics.archived_count, color: 'bg-slate-50 border-slate-200' }
  ];

  return (
    <div className="space-y-10">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className={`group relative overflow-hidden rounded-[2rem] border p-6 transition-all hover:shadow-xl dark:bg-navy-900/50 dark:backdrop-blur-xl ${card.color} dark:border-white/5`}>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">{card.value}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Category Distribution */}
        {categoryStats.length > 0 && (
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/50 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-0.5 w-8 bg-amber-500" />
              <h3 className="text-sm font-black text-navy-950 dark:text-white uppercase tracking-widest">Proporsi Kategori</h3>
            </div>
            <div className="space-y-6">
              {categoryStats.slice(0, 5).map((stat) => (
                <div key={`${stat.category}-${stat.status}`} className="group">
                  <div className="flex justify-between mb-2 items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.status}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{stat.category}</span>
                    </div>
                    <span className="text-lg font-black text-navy-950 dark:text-white tabular-nums">{stat.percentage}%</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Trend (Visual Approach) */}
        {weeklyStats.length > 0 && (
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/50 p-8 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-0.5 w-8 bg-rose-500" />
              <h3 className="text-sm font-black text-navy-950 dark:text-white uppercase tracking-widest">Tren Aktivitas Mingguan</h3>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {weeklyStats.slice(0, 8).map((stat, i) => (
                <div key={i} className="group relative flex items-center gap-6 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5">
                   <div className="flex flex-col items-center justify-center min-w-[60px] h-14 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">W{i+1}</span>
                      <span className="text-xs font-bold text-navy-950 dark:text-white">Trend</span>
                   </div>
                   
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{stat.week_start}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.status}</span>
                      </div>
                      <h4 className="text-sm font-bold text-navy-950 dark:text-white truncate">{stat.category}</h4>
                   </div>

                   <div className="text-right">
                      <p className="text-2xl font-black text-navy-950 dark:text-white tabular-nums">{stat.count}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laporan</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-6 border-t border-slate-200 dark:border-white/5">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          Sinkronisasi Data Terakhir: {analytics.latest_report_at ? new Date(analytics.latest_report_at).toLocaleString('id-ID') : 'N/A'}
        </p>
      </div>
    </div>
  );
}
