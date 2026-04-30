'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { Navbar } from '@/components/Navbar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toast } from '@/components/Toast';
import {
  buildAttachmentMetadata,
  detectAttachmentKind,
  formatBytes,
  generateReportCode,
  getAttachmentLabel,
  getReportCategoryCode,
  validateAttachmentFile
} from '@/lib/reportUtils';

type ReportPageProps = {
  params: {
    category: string;
  };
};

type FieldMap = {
  namaInisial: string;
  programStudiAngkatan: string;
  whatsapp: string;
  privacy: 'Publik' | 'Rahasiakan Identitas';
  opini: string;
  deskripsiMasalah: string;
  gedungLokasi: string;
  jenisKerusakan: string;
  pihakTerlibat: string;
  kontakSaksi: string;
  waktuKejadian: string;
  detailLokasi: string;
  buktiFoto: File[];
};

const categoryConfig: Record<string, { title: string; subtitle: string; accent: string }> = {
  fasilitas: {
    title: 'Fasilitas & Infrastruktur',
    subtitle: 'Fokus pada gedung, ruang, jaringan, dan kerusakan fasilitas kampus.',
    accent: 'from-sky-500 to-navy-700'
  },
  akademik: {
    title: 'Isu Akademik & Birokrasi',
    subtitle: 'Untuk kendala layanan akademik, administrasi, dan prosedur kampus.',
    accent: 'from-navy-600 to-slate-800'
  },
  politik: {
    title: 'Politik & Organisasi Kampus',
    subtitle: 'Untuk peristiwa organisasi, kebijakan, atau dinamika internal kampus.',
    accent: 'from-indigo-600 to-navy-800'
  },
  keamanan: {
    title: 'Keamanan & Lingkungan',
    subtitle: 'Untuk kejadian keamanan, area rawan, dan kondisi lingkungan kampus.',
    accent: 'from-emerald-600 to-navy-800'
  },
  lainnya: {
    title: 'Pelaporan Lainnya',
    subtitle: 'Untuk isu di luar empat kategori utama, termasuk masukan, kritik, atau opini yang ingin dikutip redaksi.',
    accent: 'from-amber-500 to-navy-800'
  }
};

const initialFormState: FieldMap = {
  namaInisial: '',
  programStudiAngkatan: '',
  whatsapp: '',
  privacy: 'Rahasiakan Identitas',
  opini: '',
  deskripsiMasalah: '',
  gedungLokasi: '',
  jenisKerusakan: '',
  pihakTerlibat: '',
  kontakSaksi: '',
  waktuKejadian: '',
  detailLokasi: '',
  buktiFoto: []
};

function getAdditionalData(category: string, form: FieldMap) {
  return {
    opini: form.opini.trim(),
    ...(category === 'fasilitas'
      ? {
          gedung_lokasi: form.gedungLokasi.trim(),
          jenis_kerusakan: form.jenisKerusakan.trim()
        }
      : {}),
    ...(category === 'politik'
      ? {
          pihak_terlibat: form.pihakTerlibat.trim(),
          kontak_saksi_cp: form.kontakSaksi.trim()
        }
      : {}),
    ...(category === 'keamanan'
      ? {
          waktu_kejadian: form.waktuKejadian.trim(),
          detail_lokasi: form.detailLokasi.trim()
        }
      : {})
  };
}

export default function ReportCategoryPage({ params }: ReportPageProps) {
  const router = useRouter();
  const category = params.category;
  const config = categoryConfig[category];

  const extraFields = useMemo(() => {
    if (category === 'fasilitas') return ['Gedung/Lokasi', 'Jenis Kerusakan'];
    if (category === 'politik') return ['Pihak Terlibat', 'Kontak Saksi/CP'];
    if (category === 'keamanan') return ['Waktu Kejadian', 'Detail Lokasi'];
    if (category === 'lainnya') return ['Opini / Catatan Redaksi (opsional)'];
    return [] as string[];
  }, [category]);

  const [form, setForm] = useState<FieldMap>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedFilesSummary, setSelectedFilesSummary] = useState<string[]>([]);
  const [lastReportCode, setLastReportCode] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastConfig, setToastConfig] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info' });
  const [isCopied, setIsCopied] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const updateField = <K extends keyof FieldMap>(field: K, value: FieldMap[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (form.buktiFoto.length > 5) {
      return 'Maksimal upload 5 lampiran dalam satu laporan.';
    }

    if (!form.programStudiAngkatan.trim() || !form.whatsapp.trim() || !form.deskripsiMasalah.trim()) {
      return 'Lengkapi Program Studi & Angkatan, Nomor WhatsApp, dan Deskripsi Masalah.';
    }

    if (category === 'fasilitas' && (!form.gedungLokasi.trim() || !form.jenisKerusakan.trim())) {
      return 'Lengkapi Gedung/Lokasi dan Jenis Kerusakan untuk kategori fasilitas.';
    }

    if (category === 'politik' && (!form.pihakTerlibat.trim() || !form.kontakSaksi.trim())) {
      return 'Lengkapi Pihak Terlibat dan Kontak Saksi/CP untuk kategori politik.';
    }

    if (category === 'keamanan' && (!form.waktuKejadian.trim() || !form.detailLokasi.trim())) {
      return 'Lengkapi Waktu Kejadian dan Detail Lokasi untuk kategori keamanan.';
    }

    if (form.opini.trim().length > 0 && form.opini.trim().length < 10) {
      return 'Jika diisi, opini minimal 10 karakter agar layak dikutip.';
    }

    if (form.deskripsiMasalah.trim().length > 5000) {
      return 'Deskripsi masalah terlalu panjang (maksimal 5000 karakter).';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!config) {
      setError('Kategori tidak ditemukan. Silakan kembali ke beranda.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    // Submission Cooldown (30 seconds)
    const now = Date.now();
    if (now - lastSubmitTime < 30000) {
      const waitTime = Math.ceil((30000 - (now - lastSubmitTime)) / 1000);
      setError(`Harap tunggu ${waitTime} detik sebelum mengirim laporan lagi.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const reportCode = generateReportCode(category);
      let evidenceUrl: string | null = null;
      const attachments: Array<{
        url: string;
        name: string;
        mime: string;
        size: number;
        kind: string;
      }> = [];

      if (form.buktiFoto.length > 0) {
        for (const photo of form.buktiFoto.slice(0, 5)) {
          const validationError = validateAttachmentFile(photo);
          if (validationError) {
            throw new Error(`${photo.name}: ${validationError}`);
          }

          // Server-side Magic Bytes Validation
          const validationFormData = new FormData();
          validationFormData.append('file', photo);
          
          const verifyResponse = await fetch('/api/validate-upload', {
            method: 'POST',
            body: validationFormData
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            throw new Error(`File ${photo.name} ditolak: ${errorData.error}`);
          }

          const extension = photo.name.split('.').pop() ?? 'bin';
          const fileName = `${category}/${reportCode}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
          const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, photo, { 
            upsert: false,
            contentType: photo.type || 'application/octet-stream'
          });

          if (uploadError) {
            throw new Error(`Upload lampiran gagal: ${uploadError.message}`);
          }

          const { data } = supabase.storage.from('evidence').getPublicUrl(fileName);
          attachments.push(buildAttachmentMetadata(photo, data.publicUrl));
        }

        evidenceUrl = attachments.find((item) => item.kind === 'image')?.url ?? attachments[0]?.url ?? null;
      }

      const { error: insertError } = await supabase.from('reports').insert({
        category,
        reporter_name: form.namaInisial.trim() || null,
        prodi: form.programStudiAngkatan.trim(),
        whatsapp: form.whatsapp.trim(),
        privacy: form.privacy,
        description: form.deskripsiMasalah.trim(),
        evidence_url: evidenceUrl,
        additional_data: {
          report_code: reportCode,
          attachments,
          ...getAdditionalData(category, form),
          ...(attachments.length > 0 ? { evidence_urls: attachments.map((item) => item.url) } : {})
        }
      });

      if (insertError) {
        throw new Error(`Gagal menyimpan laporan: ${insertError.message}`);
      }

      setLastSubmitTime(Date.now());
      setLastReportCode(reportCode);
      setShowSuccessModal(true);
      setIsCopied(false);
      setForm(initialFormState);
      setSelectedFilesSummary([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Terjadi kesalahan saat mengirim laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTicketCode = async () => {
    if (!lastReportCode) return;

    try {
      await navigator.clipboard.writeText(lastReportCode);
      setIsCopied(true);
      setToastConfig({ message: `Nomor tiket ${lastReportCode} disalin!`, type: 'success' });
      setShowToast(true);
    } catch {
      setToastConfig({ message: 'Gagal menyalin nomor tiket.', type: 'error' });
      setShowToast(true);
    }
  };

  if (!config) {
    return (
      <main className="min-h-screen px-6 py-10 text-slate-900 md:px-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-navy-700">INTERAKSI</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-950">Kategori tidak ditemukan</h1>
          <p className="mt-4 text-slate-600">Pilih kategori yang tersedia dari halaman utama.</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800">
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <ThemeToggle />
      <main className="min-h-screen px-4 py-20 text-slate-900 dark:text-slate-100 transition-colors duration-300 dark:bg-navy-950 md:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden rounded-[2rem] bg-navy-950 px-6 py-8 text-white shadow-soft lg:px-8 lg:py-10">
          <div className={`absolute inset-0 bg-gradient-to-br ${config.accent} opacity-90`} />
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-14 right-0 h-56 w-56 rounded-full bg-sky-300/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <Link href="/" className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-100">
                INTERAKSI
              </Link>
              <h1 className="mt-4 max-w-md text-4xl font-bold tracking-tight md:text-5xl">{config.title}</h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-50/85">{config.subtitle}</p>

              <div className="mt-8 grid gap-3 text-sm text-blue-50/90">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Data umum: nama/inisial, prodi, WhatsApp, privasi, deskripsi, dan lampiran bukti.</div>
                {extraFields.length > 0 && <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Field khusus: {extraFields.join(' + ')}</div>}
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Kode tiket akan otomatis diawali {getReportCategoryCode(category)} dan dipakai untuk pencarian.</div>
              </div>
            </div>

            
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8 dark:bg-slate-900/80 dark:border-slate-700">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700 dark:text-amber-500">Form Pelaporan</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950 dark:text-white">Isi laporan secara lengkap</h2>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/bantuan" className="text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-500">
                Bantuan Singkat
              </Link>
              <Link href="/" className="text-sm font-semibold text-navy-700 hover:text-navy-900 dark:text-slate-300">
                Beranda
              </Link>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nama/Inisial" value={form.namaInisial} onChange={(value) => updateField('namaInisial', value)} placeholder="Opsional" />
              <Field
                label="Program Studi & Angkatan"
                value={form.programStudiAngkatan}
                onChange={(value) => updateField('programStudiAngkatan', value)}
                placeholder="Contoh: Ilmu Komunikasi 2023"
                required
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Nomor WhatsApp"
                value={form.whatsapp}
                onChange={(value) => updateField('whatsapp', value)}
                placeholder="Contoh: 08xxxxxxxxxx"
                required
              />
              <SelectField
                label="Status Privasi"
                value={form.privacy}
                onChange={(value) => updateField('privacy', value as FieldMap['privacy'])}
                options={['Publik', 'Rahasiakan Identitas']}
              />
            </div>

            <TextareaField
              label="Opini / Catatan Redaksi (opsional)"
              value={form.opini}
              onChange={(value) => updateField('opini', value)}
              placeholder="Tulis opini, kutipan, atau sudut pandang yang boleh dikutip redaksi."
            />

            {category === 'fasilitas' && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Gedung/Lokasi"
                  value={form.gedungLokasi}
                  onChange={(value) => updateField('gedungLokasi', value)}
                  placeholder="Contoh: Gedung B Lantai 3"
                  required
                />
                <Field
                  label="Jenis Kerusakan"
                  value={form.jenisKerusakan}
                  onChange={(value) => updateField('jenisKerusakan', value)}
                  placeholder="Contoh: Lampu mati"
                  required
                />
              </div>
            )}

            {category === 'politik' && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Pihak Terlibat"
                  value={form.pihakTerlibat}
                  onChange={(value) => updateField('pihakTerlibat', value)}
                  placeholder="Contoh: Organisasi X"
                  required
                />
                <Field
                  label="Kontak Saksi/CP"
                  value={form.kontakSaksi}
                  onChange={(value) => updateField('kontakSaksi', value)}
                  placeholder="Contoh: 08xxxxxxxxxx"
                  required
                />
              </div>
            )}

            {category === 'keamanan' && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Waktu Kejadian"
                  value={form.waktuKejadian}
                  onChange={(value) => updateField('waktuKejadian', value)}
                  placeholder="Contoh: 19 April 2026, 21.10 WIB"
                  required
                />
                <Field
                  label="Detail Lokasi"
                  value={form.detailLokasi}
                  onChange={(value) => updateField('detailLokasi', value)}
                  placeholder="Contoh: Parkiran belakang"
                  required
                />
              </div>
            )}

            <TextareaField
              label="Deskripsi Masalah"
              value={form.deskripsiMasalah}
              onChange={(value) => updateField('deskripsiMasalah', value)}
              placeholder="Jelaskan kronologi kejadian secara jelas dan ringkas."
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Upload Lampiran Bukti</label>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,video/*"
                title="Upload Lampiran Bukti"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 5) {
                    setError('Maksimal upload 5 lampiran dalam satu laporan.');
                    updateField('buktiFoto', files.slice(0, 5));
                    setSelectedFilesSummary(
                      files.slice(0, 5).map((file) => `${file.name} (${getAttachmentLabel(detectAttachmentKind(file.type, file.name))})`)
                    );
                    return;
                  }
                  const validationErrors = files.map((file) => validateAttachmentFile(file)).filter(Boolean);
                  if (validationErrors.length > 0) {
                    setError(validationErrors[0]);
                    updateField('buktiFoto', []);
                    setSelectedFilesSummary([]);
                    return;
                  }
                  updateField('buktiFoto', files);
                  setSelectedFilesSummary(
                    files.map((file) => `${file.name} (${getAttachmentLabel(detectAttachmentKind(file.type, file.name))}, ${formatBytes(file.size)})`)
                  );
                }}
                className="block w-full cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-navy-950 dark:file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-navy-200"
              />
              {form.buktiFoto.length > 0 && (
                <div className="space-y-1 text-xs text-slate-600">
                  <p>{form.buktiFoto.length} lampiran dipilih (maksimal 5).</p>
                  {selectedFilesSummary.length > 0 && (
                    <ul className="space-y-1">
                      {selectedFilesSummary.map((name) => (
                        <li key={name} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-xs leading-5 text-slate-500">Format yang diterima: foto, PDF, dan video. INTERAKSI menjamin kerahasiaan identitas informan sesuai dengan UU Pers No. 40 Tahun 1999 dan Kode Etik Jurnalistik.</p>
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            
            <div className="flex flex-col gap-3 sm:flex-row pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-navy-950 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-navy-950 transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Mengirim laporan...' : 'Sampaikan Aspirasi'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-navy-200 hover:text-navy-900"
              >
                Kembali
              </button>
            </div>
          </form>
        </section>
      </div>
      </main>
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md animate-fade-in-up rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-center font-display text-2xl font-bold text-navy-950 dark:text-white mb-2">Laporan Terkirim!</h3>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Laporanmu sedang diproses oleh redaksi. <span className="font-bold text-rose-600 dark:text-rose-500">Penting:</span> Simpan kode tiket di bawah untuk melacak progres laporanmu.
            </p>

            <div className="relative group mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Nomor Tiket Anda</span>
                <span className="font-mono text-3xl font-black text-navy-950 dark:text-amber-400 tracking-tighter">{lastReportCode}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCopyTicketCode}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all ${
                  isCopied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-navy-950 dark:bg-amber-500 text-white dark:text-navy-950 hover:scale-[1.02]'
                }`}
              >
                {isCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.626.285 1.1.89 1.248 1.597M18 13.5c0 1.105-.895 2-2 2H8c-1.105 0-2-.895-2-2V9.5a2 2 0 012-2h8a2 2 0 012 2v4z" />
                    </svg>
                    Berhasil Disalin!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                    Salin Kode Tiket
                  </>
                )}
              </button>
              
              <button
                type="button"
                disabled={!isCopied}
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/');
                }}
                className={`w-full rounded-2xl py-4 text-sm font-bold transition-all ${
                  isCopied 
                    ? 'bg-slate-100 dark:bg-slate-800 text-navy-950 dark:text-white hover:bg-slate-200' 
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 cursor-not-allowed border border-dashed border-slate-200 dark:border-slate-800'
                }`}
              >
                Selesai & Kembali
              </button>
              {!isCopied && (
                <p className="text-center text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1">
                  Wajib salin kode sebelum lanjut
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastConfig.message}
          type={toastConfig.type}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-navy-300 focus:ring-4 focus:ring-navy-100 dark:focus:ring-slate-800"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <select
        value={value}
        title={label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100 dark:focus:ring-slate-800"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-navy-300 focus:ring-4 focus:ring-navy-100 dark:focus:ring-slate-800"
      />
    </div>
  );
}
