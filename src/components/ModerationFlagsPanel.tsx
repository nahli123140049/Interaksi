'use client';

import { useState } from 'react';
import type { ModerationFlag, FlagType, FlagPriority } from '@/lib/newFeatures';

interface ModerationFlagsPanelProps {
  reportId: string;
  flags: ModerationFlag[];
  onAddFlag: (flagType: FlagType, priority: FlagPriority, description: string) => void;
  onResolveFlag: (flagId: string) => void;
  isLoading?: boolean;
}

const flagTypeLabels: Record<FlagType, string> = {
  'duplicate': '🔄 Duplikat',
  'priority': '⚡ Prioritas Tinggi',
  'spam': '📧 Spam',
  'inappropriate': '⚠️ Tidak Pantas',
  'low_quality': '📉 Kualitas Rendah'
};

const flagTypeColors: Record<FlagType, string> = {
  'duplicate': 'bg-slate-100 text-slate-800 border-slate-300',
  'priority': 'bg-red-100 text-red-800 border-red-300',
  'spam': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'inappropriate': 'bg-orange-100 text-orange-800 border-orange-300',
  'low_quality': 'bg-blue-100 text-blue-800 border-blue-300'
};

const priorityLabels: Record<FlagPriority, string> = {
  'low': 'Rendah',
  'medium': 'Sedang',
  'high': 'Tinggi'
};

const priorityColors: Record<FlagPriority, string> = {
  'low': 'text-slate-600 bg-slate-100',
  'medium': 'text-amber-700 bg-amber-100',
  'high': 'text-red-700 bg-red-100'
};

export function ModerationFlagsPanel({
  reportId,
  flags,
  onAddFlag,
  onResolveFlag,
  isLoading = false
}: ModerationFlagsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFlagType, setSelectedFlagType] = useState<FlagType>('duplicate');
  const [selectedPriority, setSelectedPriority] = useState<FlagPriority>('medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeFlags = flags.filter(f => !f.resolved_at);
  const resolvedFlags = flags.filter(f => f.resolved_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlagType || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddFlag(selectedFlagType, selectedPriority, description);
      setDescription('');
      setSelectedFlagType('duplicate');
      setSelectedPriority('medium');
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">🚩 Moderasi Konten</h3>
        {activeFlags.length > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
            {activeFlags.length} aktif
          </span>
        )}
      </div>

      {/* Active Flags */}
      {activeFlags.length > 0 && (
        <div className="mb-4 space-y-2">
          {activeFlags.map((flag) => (
            <div
              key={flag.id}
              className={`border-l-4 p-3 rounded ${flagTypeColors[flag.flag_type]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">
                    {flagTypeLabels[flag.flag_type]}
                  </p>
                  {flag.description && (
                    <p className="text-sm mb-2 opacity-90">{flag.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <span className={`px-2 py-1 rounded ${priorityColors[flag.priority]}`}>
                      Prioritas {priorityLabels[flag.priority]}
                    </span>
                    {flag.created_by && (
                      <span>• {flag.created_by}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => flag.id && onResolveFlag(flag.id)}
                  disabled={isLoading}
                  className="text-xs font-medium px-2 py-1 bg-white bg-opacity-50 hover:bg-opacity-100 rounded disabled:opacity-50 transition"
                >
                  ✓ Selesai
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved Flags */}
      {resolvedFlags.length > 0 && (
        <details className="mb-4">
          <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-900 font-medium">
            📋 Riwayat ({resolvedFlags.length})
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {resolvedFlags.map((flag) => (
              <div key={flag.id} className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                <p>{flagTypeLabels[flag.flag_type]}</p>
                {flag.resolved_by && (
                  <p className="text-slate-600">
                    Diselesaikan oleh {flag.resolved_by}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Add New Flag Form */}
      {showAddForm ? (
        <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Tipe Flag
            </label>
            <select
              value={selectedFlagType}
              onChange={(e) => setSelectedFlagType(e.target.value as FlagType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {(Object.entries(flagTypeLabels) as Array<[FlagType, string]>).map(
                ([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Prioritas
            </label>
            <div className="flex gap-2">
              {(Object.entries(priorityLabels) as Array<[FlagPriority, string]>).map(
                ([priority, label]) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setSelectedPriority(priority)}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                      selectedPriority === priority
                        ? `${priorityColors[priority]} ring-2 ring-offset-1`
                        : `${priorityColors[priority]} opacity-50 hover:opacity-75`
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan mengapa laporan ini perlu di-flag..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Menyimpan...' : '+ Tambah Flag'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          + Tambah Flag
        </button>
      )}
    </div>
  );
}
