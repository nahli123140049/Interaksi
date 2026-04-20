'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

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
  const evidenceUrls = form.buktiFoto.map((file) => file.name).filter(Boolean);

  return {
    opini: form.opini.trim(),
    ...(evidenceUrls.length > 0
      ? {
          uploaded_photo_names: evidenceUrls
        }
      : {}),
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

  const updateField = <K extends keyof FieldMap>(field: K, value: FieldMap[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
        if (form.buktiFoto.length > 5) {
          return 'Maksimal upload 5 foto dalam satu laporan.';
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

    setIsSubmitting(true);

    try {
      let evidenceUrl: string | null = null;
      const evidenceUrls: string[] = [];

      if (form.buktiFoto.length > 0) {
        for (const photo of form.buktiFoto.slice(0, 5)) {
          const extension = photo.name.split('.').pop() ?? 'jpg';
          const fileName = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
          const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, photo, { upsert: false });

          if (uploadError) {
            throw new Error(`Upload bukti gagal: ${uploadError.message}`);
          }

          const { data } = supabase.storage.from('evidence').getPublicUrl(fileName);
          evidenceUrls.push(data.publicUrl);
        }

        evidenceUrl = evidenceUrls[0] ?? null;
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
          ...getAdditionalData(category, form),
          ...(evidenceUrls.length > 0 ? { evidence_urls: evidenceUrls } : {})
        }
      });

      if (insertError) {
        throw new Error(`Gagal menyimpan laporan: ${insertError.message}`);
      }

      setMessage('Laporan berhasil dikirim. Terima kasih sudah menyuarakan isu kampus.');
      setForm(initialFormState);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Terjadi kesalahan saat mengirim laporan.');
    } finally {
      setIsSubmitting(false);
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
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
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
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Data umum: nama/inisial, prodi, WhatsApp, privasi, deskripsi, dan bukti foto.</div>
                {extraFields.length > 0 && <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Field khusus: {extraFields.join(' + ')}</div>}
              </div>
            </div>

            
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Form Pelaporan</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Isi laporan secara lengkap</h2>
            </div>
            <Link href="/" className="text-sm font-semibold text-navy-700 hover:text-navy-900">
              Beranda
            </Link>
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
              <label className="text-sm font-semibold text-slate-700">Upload Bukti Foto</label>
              <input
                type="file"
                multiple
                accept="image/*"
                title="Upload Bukti Foto"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 5) {
                    setError('Maksimal upload 5 foto dalam satu laporan.');
                    updateField('buktiFoto', files.slice(0, 5));
                    return;
                  }
                  updateField('buktiFoto', files);
                }}
                className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-navy-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-navy-200"
              />
              {form.buktiFoto.length > 0 && (
                <p className="text-xs text-slate-600">{form.buktiFoto.length} foto dipilih (maksimal 5).</p>
              )}
              <p className="text-xs leading-5 text-slate-500">INTERAKSI menjamin kerahasiaan identitas informan sesuai dengan UU Pers No. 40 Tahun 1999 dan Kode Etik Jurnalistik.</p>
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Mengirim laporan...' : 'Sampaikan Aspirasi'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
              >
                Kembali
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
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
      <label className="text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
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
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <select
        value={value}
        title={label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
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
      <label className="text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
      />
    </div>
  );
}
