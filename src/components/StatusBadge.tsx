export type StatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
};

export const statusMetaMap: Record<string, StatusMeta> = {
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

export function getStatusMeta(status: string): StatusMeta {
  return statusMetaMap[status] ?? statusMetaMap['Menunggu Verifikasi'];
}

export function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>;
}
