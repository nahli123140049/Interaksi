export type ReportCategory = 'fasilitas' | 'akademik' | 'politik' | 'keamanan' | 'lainnya';

export const reportCategoryMeta: Record<ReportCategory, { title: string; code: string }> = {
  fasilitas: { title: 'Fasilitas & Infrastruktur', code: 'FI' },
  akademik: { title: 'Isu Akademik & Birokrasi', code: 'AB' },
  politik: { title: 'Politik & Organisasi Kampus', code: 'PO' },
  keamanan: { title: 'Keamanan & Lingkungan', code: 'KL' },
  lainnya: { title: 'Pelaporan Lainnya', code: 'LN' }
};

export type ReportAttachmentKind = 'image' | 'pdf' | 'video' | 'file';

export interface ReportAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
  kind: ReportAttachmentKind;
}

export function getReportCategoryCode(category: string) {
  return reportCategoryMeta[category as ReportCategory]?.code ?? 'RP';
}

export function getReportCategoryTitle(category: string) {
  return reportCategoryMeta[category as ReportCategory]?.title ?? category;
}

export function generateReportCode(category: string) {
  const prefix = getReportCategoryCode(category);
  const uniquePart = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, '')
    .slice(-5)
    .padStart(5, '0');

  return `${prefix}-${uniquePart}`;
}

export function detectAttachmentKind(mime: string, name: string): ReportAttachmentKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';

  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(extension ?? '')) return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif'].includes(extension ?? '')) return 'image';

  return 'file';
}

export function validateAttachmentFile(file: File) {
  const kind = detectAttachmentKind(file.type, file.name);
  const allowedKinds: ReportAttachmentKind[] = ['image', 'pdf', 'video'];

  if (!allowedKinds.includes(kind)) {
    return 'Format file belum didukung. Gunakan foto, PDF, atau video.';
  }

  const maxSizeBytes = 50 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return 'Ukuran file terlalu besar. Maksimal 50MB per file.';
  }

  return '';
}

export function getAttachmentLabel(kind: ReportAttachmentKind) {
  if (kind === 'image') return 'Foto';
  if (kind === 'pdf') return 'PDF';
  if (kind === 'video') return 'Video';
  return 'File';
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildAttachmentMetadata(file: File, url: string): ReportAttachment {
  return {
    url,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    kind: detectAttachmentKind(file.type, file.name)
  };
}

export function parseReportCode(data: Record<string, unknown> | null | undefined) {
  return String(data?.report_code ?? '').trim();
}

export function parseReportAttachments(data: Record<string, unknown> | null | undefined) {
  const attachmentsValue = data?.attachments;
  const fallbackUrls = data?.evidence_urls;
  const attachments: ReportAttachment[] = [];

  if (Array.isArray(attachmentsValue)) {
    for (const item of attachmentsValue) {
      if (!item || typeof item !== 'object') continue;

      const record = item as Record<string, unknown>;
      const url = String(record.url ?? '').trim();
      const name = String(record.name ?? 'Lampiran').trim();
      const mime = String(record.mime ?? '').trim() || 'application/octet-stream';
      const size = Number(record.size ?? 0);
      const kind = detectAttachmentKind(mime, name);

      if (url) {
        attachments.push({ url, name, mime, size: Number.isFinite(size) ? size : 0, kind });
      }
    }
  }

  if (attachments.length === 0) {
    const fallbackList = Array.isArray(fallbackUrls)
      ? fallbackUrls
      : typeof fallbackUrls === 'string'
        ? fallbackUrls
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

    for (const urlValue of fallbackList) {
      const url = String(urlValue).trim();
      if (!url) continue;
      attachments.push({
        url,
        name: 'Lampiran',
        mime: 'image/*',
        size: 0,
        kind: 'image'
      });
    }
  }

  return attachments;
}

export function getReportSearchText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getSlaMeta(createdAt: string, status: string) {
  const finalStatuses = new Set(['Telah Terbit', 'Arsip Internal', 'Ditolak/Tidak Valid']);
  if (finalStatuses.has(status)) {
    return { label: 'Selesai', tone: 'emerald' as const, overdue: false, warning: false };
  }

  const created = new Date(createdAt).getTime();
  const ageHours = Math.max(0, (Date.now() - created) / (1000 * 60 * 60));

  if (ageHours >= 48) {
    return { label: 'Terlambat', tone: 'rose' as const, overdue: true, warning: true };
  }

  if (ageHours >= 24) {
    return { label: 'Perlu Diingat', tone: 'amber' as const, overdue: false, warning: true };
  }

  return { label: 'On Track', tone: 'cyan' as const, overdue: false, warning: false };
}