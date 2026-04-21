import Image from 'next/image';
import Link from 'next/link';

const categories = [
  {
    slug: 'fasilitas',
    title: 'Fasilitas & Infrastruktur',
    description: 'Laporkan gedung, ruang kelas, toilet, jaringan, atau fasilitas yang perlu perbaikan.'
  },
  {
    slug: 'akademik',
    title: 'Isu Akademik & Birokrasi',
    description: 'Sampaikan kendala layanan akademik, administrasi, jadwal, atau prosedur kampus.'
  },
  {
    slug: 'politik',
    title: 'Politik & Organisasi Kampus',
    description: 'Catat dinamika organisasi, kebijakan kampus, atau peristiwa yang butuh sorotan.'
  },
  {
    slug: 'keamanan',
    title: 'Keamanan & Lingkungan',
    description: 'Laporkan kejadian keamanan, area rawan, pencahayaan, dan kondisi lingkungan kampus.'
  },
  {
    slug: 'lainnya',
    title: 'Pelaporan Lainnya',
    description: 'Untuk isu di luar empat kategori utama, termasuk masukan, kritik, atau opini yang ingin dikutip redaksi.'
  }
];

const tickerItems = [
  'Redaksi menerima laporan mahasiswa setiap hari',
  'Lindungi identitas pelapor dengan mode anonim',
  'Pantau progres laporan dari dashboard publik',
  'Baca rilis investigasi di kanal Berita Redaksi'
];

export default function HomePage() {
  return (
    <main className="editorial-shell min-h-screen text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="glass-panel reveal-fade rounded-[2rem] px-6 py-5 shadow-soft lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-48 items-center justify-start rounded-2xl border border-slate-200/80 bg-white px-4 shadow-card">
                  <Image
                    src="/images/LOGO-INTERAKSI.png"
                    alt="Logo INTERAKSI"
                    width={180}
                    height={56}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="section-title">INTERAKSI</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-5xl">
                    Newsroom Aspirasi Mahasiswa
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-amber-700 md:text-base">Inovasi, Terintegrasi, dan Aksi</p>
                </div>
              </div>
            </div>
            <div className="max-w-xl rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600 md:text-right">
              Platform pelaporan dan media kampus yang dikelola oleh Lembaga Pers ITERA untuk mengubah keluhan menjadi data, dan data menjadi aksi redaksi.
            </div>
          </div>

          <div className="headline-ticker mt-5 rounded-2xl border border-slate-200/70 bg-white/75 py-2">
            <div className="headline-track">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <span key={`${item}-${index}`} className="headline-pill">
                  <span className="headline-dot" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              Command Center Publik
            </Link>
            
            <Link
              href="/admin"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-950"
            >
              Dashboard Admin
            </Link>
          </div>
        </header>

        <section className="mt-10 grid flex-1 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="glass-panel reveal-fade rounded-[1.75rem] p-6 shadow-card">
              <p className="section-title">Kotak Suara Mahasiswa</p>
              <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">
                Satu laporan yang jelas bisa menggerakkan tindak lanjut redaksi.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                Pilih kategori, isi formulir yang relevan, lalu kirim. Setiap laporan akan masuk ke workflow verifikasi redaksi sebelum dipublikasikan.
              </p>               
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {categories.map((category, index) => (
                <Link
                  key={category.slug}
                  href={`/report/${category.slug}`}
                  className="group reveal-fade rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-950 text-sm font-bold text-white">
                        0{index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-navy-950">{category.title}</h3>
                    </div>
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 transition group-hover:bg-amber-100">
                      Lapor
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{category.description}</p>
                  <p className="mt-5 text-sm font-semibold text-navy-800">Buka formulir -&gt;</p>
                </Link>
              ))}
            </div>
          </div>
          
        </section>

        <section className="mt-12 space-y-6">
          <div className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">Profil INTERAKSI</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">
              Identitas INTERAKSI
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 md:text-base">
              INTERAKSI adalah ruang temu aspirasi mahasiswa yang menempatkan inovasi, integrasi, dan dampak nyata sebagai arah kerja redaksi.
              Bukan sekadar papan pengumuman, tetapi jembatan ide, data, dan aksi untuk mengawal informasi kampus.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-card">
              <h3 className="text-xl font-bold text-navy-950">Filosofi</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                INTERAKSI dimaknai sebagai hubungan timbal balik yang aktif: ada suara, ada respons; ada isu, ada solusi. Platform ini dibangun
                agar aspirasi mahasiswa tidak berhenti di keluhan, tapi berlanjut menjadi tindak lanjut.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-card">
              <h3 className="text-xl font-bold text-navy-950">Makna Nama</h3>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                <p>
                  <span className="font-semibold text-navy-900">IN (Inovasi):</span> jurnalisme mahasiswa berbasis data, visual, dan pemanfaatan
                  teknologi untuk menyampaikan kebenaran.
                </p>
                <p>
                  <span className="font-semibold text-navy-900">TERA (ITERA):</span> menegaskan identitas sebagai bagian dari Institut Teknologi
                  Sumatera dan seluruh sivitas akademika.
                </p>
                <p>
                  <span className="font-semibold text-navy-900">AKSI (Action):</span> setiap konten diarahkan menghasilkan output nyata: edukasi,
                  gerakan, dan pengawalan kebijakan kampus.
                </p>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-card">
              <h3 className="text-xl font-bold text-navy-950">Identitas Warna</h3>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>
                  <span className="font-semibold text-[#3B2D8F]">Deep Purple & Indigo:</span> independensi, kreativitas, dan wibawa lembaga pers.
                </p>
                <p>
                  <span className="font-semibold text-amber-600">Amber Orange:</span> energi dan keberanian dalam merangkul aspirasi mahasiswa.
                </p>
                <p>
                  <span className="font-semibold text-navy-900">Navy Blue (Dark):</span> kepercayaan, integritas, dan profesionalitas jurnalistik.
                </p>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-card">
              <h3 className="text-xl font-bold text-navy-950">Elemen Konektivitas</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Simbol garis yang saling terhubung merepresentasikan sinergi: INTERAKSI berperan sebagai jembatan berbagai sudut pandang untuk
                mencapai informasi yang utuh dan dapat dipercaya.
              </p>
              <blockquote className="mt-6 rounded-2xl border border-navy-100 bg-navy-50 px-4 py-3 text-sm font-semibold italic text-navy-900">
                "Suara Inovasi, Titik Temu Aspirasi, Wujud Nyata Aksi"
              </blockquote>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}