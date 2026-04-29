import Link from 'next/link';
import { PageShell } from '@/components/PageShell';

const faqItems = [
  {
    question: 'Bagaimana cara kirim laporan?',
    answer: 'Pilih kategori di beranda, isi form dengan detail yang jelas, lalu unggah lampiran bukti (foto/PDF/video). Kamu akan mendapat kode tiket setelah submit.'
  },
  {
    question: 'Apa fungsi nomor tiket?',
    answer: 'Nomor tiket dipakai untuk melacak laporan di halaman /lacak. Masukkan kode tiket untuk melihat status terkini laporanmu.'
  },
  {
    question: 'Lampiran apa saja yang diterima?',
    answer: 'Sistem menerima foto, PDF, dan video. Maksimal 5 lampiran per laporan, ukuran aman maksimal 50MB per file.'
  },
  {
    question: 'Status laporan artinya apa?',
    answer: 'Menunggu Verifikasi: laporan baru masuk. Proses Investigasi: redaksi menindaklanjuti. Telah Terbit: sudah jadi berita. Arsip Internal: valid tapi tidak diterbitkan.'
  },
  {
    question: 'Apakah identitas pelapor aman?',
    answer: 'Ya. Pelapor dapat memilih mode "Rahasiakan Identitas". Dashboard publik tidak menampilkan nama, WhatsApp, atau prodi.'
  },
  {
    question: 'Berapa lama laporan diproses?',
    answer: 'Tim redaksi akan verifikasi awal maksimal 5x24 jam kerja. Pantau status via kode tiket di halaman Lacak Laporan.'
  }
];

export default function BantuanPage() {
  return (
    <PageShell>
      <main className="relative min-h-screen overflow-hidden px-4 py-12 text-slate-900 dark:text-slate-100 md:px-6 lg:px-10">
        {/* Immersive Background Elements */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-cyan-200/20 blur-[120px] dark:bg-cyan-900/10" />
          <div className="absolute -right-[5%] top-[20%] h-[600px] w-[600px] rounded-full bg-amber-200/20 blur-[120px] dark:bg-amber-900/10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:invert" />
        </div>

        <div className="mx-auto max-w-4xl space-y-12">
          {/* Header */}
          <header className="reveal-fade relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/40">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-12 rounded-full bg-amber-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-500">Pusat Bantuan</p>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-navy-950 dark:text-white md:text-5xl">
                Panduan <span className="text-amber-600">Cepat</span> & FAQ
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Temukan jawaban atas kendala dan pertanyaan umum seputar pelaporan aspirasi di ekosistem INTERAKSI.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/50 px-6 py-3 text-xs font-bold text-slate-700 backdrop-blur-sm transition-all hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
                >
                  &larr; Kembali ke Beranda
                </Link>
                <Link
                  href="/lacak"
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-amber-600/20 transition-all hover:bg-amber-700 hover:scale-105 active:scale-95"
                >
                  Lacak Laporan
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-navy-800 active:scale-95 dark:bg-white dark:text-navy-950"
                >
                  Dashboard Publik
                </Link>
              </div>
            </div>
          </header>

          {/* FAQ Accordion */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="h-0.5 w-4 bg-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Topik Umum
              </p>
            </div>
            
            <div className="space-y-4">
              {faqItems.map((item, idx) => (
                <details
                  key={idx}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 shadow-sm backdrop-blur-md transition-all duration-300 open:shadow-xl open:border-amber-400/50 dark:border-slate-800/50 dark:bg-slate-900/30"
                >
                  <summary className="flex items-center justify-between p-6 md:p-8 font-bold text-lg text-navy-950 dark:text-white select-none cursor-pointer transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                    <span className="pr-8">{item.question}</span>
                    <span className="shrink-0 transition-transform duration-500 group-open:rotate-180 text-amber-500">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 md:px-8 pb-8 pt-2 text-base leading-relaxed text-slate-600 dark:text-slate-400 animate-in slide-in-from-top-4 duration-500">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent mb-6" />
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* CTA Bottom */}
          <div className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-navy-950 p-10 text-center lg:p-16 dark:border-slate-800/50 dark:bg-slate-900/40 backdrop-blur-xl">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-white">Sudah Paham Alurnya?</h2>
              <p className="mt-4 text-slate-300 text-lg">Pilih kategori yang sesuai dan sampaikan aspirasimu sekarang juga.</p>
              <Link
                href="/#kategori"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-500 px-10 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
              >
                Kirim Laporan &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}