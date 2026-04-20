'use client';

import { useEffect, useState } from 'react';
import type { AuditLogEntry } from '@/lib/newFeatures';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const actionLabels: Record<string, string> = {
  'create_report': 'Buat Laporan',
  'update_report': 'Edit Laporan',
  'update_status': 'Ubah Status',
  'create_news': 'Buat Berita',
  'update_news': 'Edit Berita',
  'delete_news': 'Hapus Berita',
  'create_flag': 'Buat Flag',
  'resolve_flag': 'Selesaikan Flag'
};

const tableNames: Record<string, string> = {
  'reports': 'Laporan',
  'news_posts': 'Berita',
  'moderation_flags': 'Flag'
};

function getActionColor(action: string): string {
  if (action.includes('create') || action.includes('insert')) return 'text-emerald-700 bg-emerald-50';
  if (action.includes('update')) return 'text-blue-700 bg-blue-50';
  if (action.includes('delete')) return 'text-rose-700 bg-rose-50';
  if (action.includes('resolve')) return 'text-amber-700 bg-amber-50';
  return 'text-slate-700 bg-slate-50';
}

export function AuditLogViewer({
  logs,
  isLoading = false,
  onLoadMore,
  hasMore = false
}: AuditLogViewerProps) {
  return (
    <div className="space-y-3">
      {logs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          Belum ada aktivitas yang tercatat
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 bg-white hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getActionColor(log.action)}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span className="text-xs text-slate-500">
                        {tableNames[log.table_name] || log.table_name}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">
                      {log.description || `No description`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>• {log.admin_email}</span>
                      <span>•</span>
                      <span>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString('id-ID')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  {(log.old_values || log.new_values) && (
                    <details className="cursor-pointer">
                      <summary className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Detail
                      </summary>
                      <div className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-200">
                        {log.old_values && (
                          <div className="mb-1">
                            <p className="font-semibold text-slate-600">Sebelum:</p>
                            <pre className="text-slate-700 overflow-auto max-h-32">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <p className="font-semibold text-slate-600">Sesudah:</p>
                            <pre className="text-slate-700 overflow-auto max-h-32">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full py-2 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Memuat...' : 'Muat Lebih Banyak'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
