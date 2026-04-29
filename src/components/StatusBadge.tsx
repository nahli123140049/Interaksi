export type StatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
};

export const statusMetaMap: Record<string, StatusMeta> = {
  'Menunggu Verifikasi': {
    label: 'Menunggu Verifikasi',
    description: 'Aspirasi telah diterima dan sedang dalam antrean verifikasi awal oleh Tim Redaksi.',
    badgeClass: 'border border-amber-200 bg-amber-50 text-amber-800'
  },
  'Proses Investigasi': {
    label: 'Proses Investigasi',
    description: 'Aspirasi sedang Dalam proses Investigasi oleh Tim Redaksi UKM LembagaPers',
    badgeClass: 'border border-blue-200 bg-blue-50 text-blue-800'
  },
  'Arsip Internal': {
    label: 'Arsip Internal',
    description: 'Aspirasi dinyatakan valid, namun karena pertimbangan tertentu, laporan ini hanya disimpan sebagai arsip internal/advokasi non-publik.',
    badgeClass: 'border border-slate-200 bg-slate-100 text-slate-700'
  },
  'Telah Terbit': {
    label: 'Telah Terbit',
    description: 'Hasil investigasi tim redaksi atas aspirasi ini telah resmi dipublikasikan di kanal berita utama.',
    badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-800'
  },
  'Ditolak/Tidak Valid': {
    label: 'Ditolak/Tidak Valid',
    description: 'Aspirasi tidak dapat ditindaklanjuti karena data pendukung belum mencukupi atau tidak sesuai dengan standar pelaporan.',
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
