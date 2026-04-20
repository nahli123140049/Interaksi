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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`border rounded-lg p-4 ${card.color}`}>
            <p className="text-sm font-medium text-slate-600">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Category Distribution */}
      {categoryStats.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-slate-900 mb-3">Distribusi Kategori</h3>
          <div className="space-y-2">
            {categoryStats.slice(0, 5).map((stat) => (
              <div key={`${stat.category}-${stat.status}`} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">
                    {stat.category} - {stat.status}
                  </span>
                  <span className="font-medium">{stat.percentage}%</span>
                </div>
                <div className="bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      {weeklyStats.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-slate-900 mb-3">Tren Mingguan</h3>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-slate-600">Minggu</th>
                  <th className="text-left py-2 px-2 text-slate-600">Kategori</th>
                  <th className="text-left py-2 px-2 text-slate-600">Status</th>
                  <th className="text-right py-2 px-2 text-slate-600">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {weeklyStats.slice(0, 8).map((stat, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-700">{stat.week_start}</td>
                    <td className="py-2 px-2 text-slate-700">{stat.category}</td>
                    <td className="py-2 px-2 text-slate-700">{stat.status}</td>
                    <td className="text-right py-2 px-2 font-medium text-slate-900">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Update terakhir: {analytics.latest_report_at ? new Date(analytics.latest_report_at).toLocaleString('id-ID') : 'N/A'}
      </div>
    </div>
  );
}
