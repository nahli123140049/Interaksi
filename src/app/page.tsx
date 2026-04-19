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

export default function HomePage() {
  return (
    <main className="min-h-screen text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="glass-panel rounded-[2rem] px-6 py-5 shadow-soft lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-48 items-center justify-start rounded-2xl border border-slate-200 bg-white px-4 shadow-card">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">INTERAKSI</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-5xl">
                    INTERAKSI - Suara Mahasiswa
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-navy-800 md:text-base">Inovasi, Terintegrasi, dan Aksi</p>
                </div>
              </div>
            </div>
            <div className="max-w-xl text-sm leading-6 text-slate-600 md:text-right">
              Platform pelaporan dan media kampus yang dikelola sebagai bagian dari Lembaga Pers ITERA, UKM yang bergerak di bidang pers dan media.
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition hover:border-navy-300 hover:text-navy-950"
            >
              Lihat Dashboard Laporan
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-950"
            >
              Admin Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-10 grid flex-1 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-navy-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-navy-800 shadow-card">
                Kotak Suara Mahasiswa
              </span>
              <div className="space-y-4">
                <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-navy-950 md:text-6xl">
                  Satu pintu untuk menyuarakan aspirasi, kritik, dan gagasan kampus secara terstruktur.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                  Pilih kategori, isi formulir dengan jelas, tambahkan opini bila perlu, lalu kirim agar tim redaksi dapat mengolahnya menjadi liputan atau tindak lanjut.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {categories.map((category, index) => (
                <Link
                  key={category.slug}
                  href={`/report/${category.slug}`}
                  className="group rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-950 text-sm font-bold text-white">
                        0{index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-navy-950">{category.title}</h3>
                    </div>
                    <span className="rounded-full border border-navy-100 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 transition group-hover:bg-navy-100">
                      Lapor
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{category.description}</p>
                  <p className="mt-5 text-sm font-semibold text-navy-800">Buka formulir -&gt;</p>
                </Link>
              ))}
            </div>
          </div>

          <aside className="glass-panel relative overflow-hidden rounded-[2rem] p-8 shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-slate-950 opacity-95" />
            <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-8 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between text-white">
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-blue-200">Ruang Aspirasi</p>
                <h3 className="max-w-sm text-3xl font-bold tracking-tight md:text-4xl">
                  Dari suara kecil menjadi perhatian yang layak ditindaklanjuti.
                </h3>
                <p className="max-w-sm text-sm leading-7 text-blue-50/85">
                  Setiap laporan dirancang singkat, jelas, dan mudah dipahami agar redaksi bisa membaca inti persoalan, menangkap opini, lalu mengolahnya menjadi langkah yang relevan.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  ['5', 'Kategori laporan'],
                  ['Opsional', 'Opini redaksi'],
                  ['Ringkas', 'Alur cepat']
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.24em] text-blue-100/80">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-12 space-y-6">
          <div className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">Profil INTERAKSI</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">
              Identitas Lembaga Pers ITERA
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