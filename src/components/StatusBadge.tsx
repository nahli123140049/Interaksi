export type StatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
};

export const statusMetaMap: Record<string, StatusMeta> = {
  'Menunggu Verifikasi': {
    label: 'Menunggu Verifikasi',
    description: 'Laporan telah diterima dan sedang dalam antrean untuk diperiksa oleh tim redaksi.',
    badgeClass: 'border border-amber-200 bg-amber-50 text-amber-800'
  },
  'Proses Investigasi': {
    label: 'Proses Investigasi',
    description: 'Tim kami sedang melakukan verifikasi lapangan, mengumpulkan bukti tambahan, atau menghubungi pihak terkait.',
    badgeClass: 'border border-blue-200 bg-blue-50 text-blue-800'
  },
  'Arsip Internal': {
    label: 'Arsip Internal',
    description: 'Laporan dinyatakan valid namun hanya disimpan sebagai data internal dan tidak dipublikasikan ke kanal publik.',
    badgeClass: 'border border-slate-200 bg-slate-100 text-slate-700'
  },
  'Telah Terbit': {
    label: 'Telah Terbit',
    description: 'Hasil investigasi laporan ini telah resmi dipublikasikan melalui kanal berita INTERAKSI.',
    badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-800'
  },
  'Ditolak/Tidak Valid': {
    label: 'Ditolak/Tidak Valid',
    description: 'Laporan tidak dapat ditindaklanjuti karena kurangnya bukti pendukung atau tidak memenuhi kriteria pelaporan.',
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
