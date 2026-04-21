import Link from 'next/link';

const faqItems = [
  {
    question: 'Bagaimana cara kirim laporan?',
    answer: 'Pilih kategori di beranda, isi form dengan detail yang jelas, lalu unggah lampiran bukti (foto/PDF/video).'
  },
  {
    question: 'Apa fungsi nomor tiket?',
    answer: 'Nomor tiket dipakai untuk melacak laporan di dashboard publik dan mempercepat pencarian oleh admin.'
  },
  {
    question: 'Lampiran apa saja yang diterima?',
    answer: 'Sistem menerima foto, PDF, dan video. Maksimal 5 lampiran per laporan, ukuran aman maksimal 50MB per file.'
  },
  {
    question: 'Status laporan artinya apa?',
    answer: 'Menunggu Verifikasi: laporan baru masuk. Proses Investigasi: redaksi menindaklanjuti. Telah Terbit/Arsip Internal: laporan sudah selesai diproses.'
  },
  {
    question: 'Apakah identitas pelapor aman?',
    answer: 'Ya. Pelapor dapat memilih mode rahasia, dan dashboard publik tidak menampilkan identitas pribadi.'
  }
];

export default function BantuanPage() {
  return (
    <main className="editorial-shell min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <p className="section-title">Bantuan Singkat</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">Panduan Cepat INTERAKSI</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Halaman ini menjawab pertanyaan paling umum agar user dan pelapor bisa langsung paham alur laporan tanpa bingung.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              Buka Dashboard Publik
            </Link>
          </div>
        </header>

        <section className="grid gap-4">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-navy-950">{item.question}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">{item.answer}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}