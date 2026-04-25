import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Navbar } from '@/components/Navbar';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getReportCategoryTitle } from '@/lib/reportUtils';
import { StatusBadge } from '@/components/StatusBadge';

// === COMPONENTS FETCHING SUPABASE DATA (WITH SUSPENSE) ===

async function LiveMetrics() {
  const fallback = { totalLaporan: 0, totalTerbit: 0 };
  let data = fallback;

  if (isSupabaseConfigured) {
    try {
      const { data: analytics, error } = await supabase
        .from('reports_analytics')
        .select('*')
        .single();

      if (!error && analytics) {
        data = {
          totalLaporan: analytics.total_reports,
          totalTerbit: analytics.published_count,
        };
      } else {
        // Fallback to manual count if view is missing
        const { count: totalLaporan } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true });

        const { count: totalTerbit } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Telah Terbit', 'Arsip Internal']);

        data = {
          totalLaporan: totalLaporan ?? 0,
          totalTerbit: totalTerbit ?? 0,
        };
      }
    } catch (error) {
      console.error('Error fetching live metrics:', error);
    }
  }

  return (
    <>
      <div className="group transition-all">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">Total Laporan Masuk</p>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-5xl font-black text-navy-950 dark:text-white transition-all group-hover:text-amber-500">
            {data.totalLaporan.toLocaleString('id-ID')}
          </p>
          <span className="text-xs font-bold text-slate-400 uppercase">Aspirasi</span>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
      <div className="group transition-all">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">Laporan Telah Terbit</p>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-5xl font-black text-navy-950 dark:text-white transition-all group-hover:text-emerald-500">
            {data.totalTerbit.toLocaleString('id-ID')}
          </p>
          <span className="text-xs font-bold text-slate-400 uppercase">Aksi Nyata</span>
        </div>
      </div>
    </>
  );
}

function LiveMetricsSkeleton() {
  return (
    <>
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
      <div className="h-px w-full bg-slate-200 dark:bg-slate-800"></div>
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    </>
  );
}

type ReportData = {
  id: string | number;
  category: string;
  description: string;
  created_at: string;
  status: string;
  additional_data?: { report_code?: string } | any;
};

async function RecentReports() {
  let reports: ReportData[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('reports')
        .select('id, category, description, created_at, status, additional_data')
        .order('created_at', { ascending: false })
        .limit(3);
      reports = data || [];
    } catch (error) {
      console.error('Error fetching recent reports:', error);
    }
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl bg-white/50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">Belum ada laporan publik terkini.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {reports.map((report) => (
        <div key={report.id} className="rounded-2xl bg-white dark:bg-slate-800/50 p-6 shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <StatusBadge status={report.status} />
            <span className="text-xs font-medium text-slate-400">
              {new Date(report.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h4 className="font-display font-bold text-lg text-navy-950 dark:text-white mb-2">{getReportCategoryTitle(report.category)}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-6">{report.description}</p>
          
          {report.additional_data?.report_code && (
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-slate-400">TKT: {report.additional_data.report_code}</span>
              <Link href={`/lacak?kode=${report.additional_data.report_code}`} className="text-xs font-bold text-amber-600 hover:text-amber-700">Lacak &rarr;</Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RecentReportsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-slate-800/50 p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
          <div className="flex justify-between mb-4">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="space-y-2 mb-6">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// === STATIC DATA ===

const categories = [
  {
    slug: 'fasilitas',
    title: 'Fasilitas & Infrastruktur',
    description: 'Laporkan gedung, ruang kelas, toilet, jaringan, atau fasilitas yang perlu perbaikan.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6.75h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-2.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V21" />
      </svg>
    ),
    accent: 'border-amber-500',
    hoverAccent: 'group-hover:border-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  {
    slug: 'akademik',
    title: 'Isu Akademik & Birokrasi',
    description: 'Sampaikan kendala layanan akademik, administrasi, jadwal, atau prosedur kampus.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    accent: 'border-amber-500',
    hoverAccent: 'group-hover:border-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  {
    slug: 'politik',
    title: 'Politik & Organisasi Kampus',
    description: 'Catat dinamika organisasi, kebijakan kampus, atau peristiwa yang butuh sorotan.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52v8.636c0 1.081-.407 2.115-1.144 2.894A15.35 15.35 0 0112 19.5c-2.482 0-4.836-.503-6.945-1.42a4.015 4.015 0 01-1.144-2.894V5.49m15 0v8.636m-15-8.636V14.13" />
      </svg>
    ),
    accent: 'border-amber-500',
    hoverAccent: 'group-hover:border-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  {
    slug: 'keamanan',
    title: 'Keamanan & Lingkungan',
    description: 'Laporkan kejadian keamanan, area rawan, pencahayaan, dan kondisi lingkungan kampus.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    accent: 'border-amber-500',
    hoverAccent: 'group-hover:border-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  {
    slug: 'lainnya',
    title: 'Pelaporan Lainnya',
    description: 'Untuk isu di luar empat kategori utama, termasuk masukan, kritik, atau opini yang ingin dikutip redaksi.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18" />
      </svg>
    ),
    accent: 'border-amber-500',
    hoverAccent: 'group-hover:border-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
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
    <main className="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-50 overflow-x-hidden pt-20">
      <ThemeToggle />
      <Navbar />
      
      {/* SECTION 1: HERO */}
      <section className="relative flex min-h-[90vh] flex-col">
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-amber-400/10 dark:bg-amber-400/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-cyan-400/10 dark:bg-cyan-400/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        {/* Main Hero Content */}
        <div className="flex-1 flex items-center justify-center relative z-10 px-6 py-12 lg:px-10">
          <div className="mx-auto w-full max-w-7xl grid gap-10 lg:gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
            
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex h-16 items-center justify-start rounded-2xl bg-white px-4 shadow-sm border border-slate-200 dark:border-white dark:bg-white backdrop-blur-md">
                <Image
                  src="/images/LOGO-INTERAKSI.png"
                  alt="Logo INTERAKSI"
                  width={180}
                  height={56}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
              
              <div className="space-y-4">
                <h1 className="font-display text-5xl font-bold tracking-tight leading-tight md:text-6xl lg:text-7xl text-navy-950 dark:text-amber-400">
                  Suara Mahasiswa,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 dark:from-white dark:to-slate-200">Didengar Redaksi.</span>
                </h1>
                <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
                  Platform pelaporan independen yang dikelola oleh UKM Lembaga Pers ITERA untuk mengubah keluhan menjadi data, dan data menjadi aksi redaksi.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <a
                  href="#kategori"
                  className="rounded-full bg-navy-950 dark:bg-white px-8 py-3.5 text-base font-semibold text-white dark:text-navy-950 transition-all hover:scale-105 hover:shadow-lg hover:shadow-navy-900/20 dark:hover:shadow-white/20"
                >
                  Kirim Laporan
                </a>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-white/5 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Lihat Dashboard Publik
                </Link>
              </div>
              
              <div>
                <Link href="/lacak" className="inline-flex items-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:opacity-80 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Cek Status Laporan &rarr;
                </Link>
              </div>
            </div>

            {/* Right Content - Floating Card with Suspense */}
            <div className="relative justify-self-center lg:justify-self-end w-full max-w-sm lg:mt-0">
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-amber-400 to-cyan-400 opacity-20 blur-xl"></div>
              <div className="relative rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 backdrop-blur-md shadow-xl dark:shadow-2xl">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Live Metrics</span>
                </div>
                
                <div className="space-y-6">
                  <Suspense fallback={<LiveMetricsSkeleton />}>
                    <LiveMetrics />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Ticker Strip */}
        <div className="w-full bg-amber-600 dark:bg-amber-700 py-4 z-10 border-t border-amber-500/30 mt-auto overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-amber-600 dark:from-amber-700 to-transparent z-20"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-amber-600 dark:from-amber-700 to-transparent z-20"></div>
          
          <div className="headline-ticker">
            <div className="headline-track" style={{ animationDuration: '60s' }}>
              {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
                <div key={`${item}-${index}`} className="inline-flex items-center gap-4 px-10 whitespace-nowrap">
                  <div className="flex items-center gap-2 bg-white/20 px-2.5 py-0.5 rounded text-[10px] font-black tracking-tighter text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                    NEWS
                  </div>
                  <span className="text-sm font-bold text-white tracking-wide">
                    {item}
                  </span>
                  <span className="text-white/40 font-light mx-4">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: KATEGORI LAPORAN */}
      <section id="kategori" className="py-20 lg:py-28 px-6 lg:px-10 relative">
        <div className="absolute inset-0 bg-white/50 dark:bg-transparent pointer-events-none"></div>
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Pilih Kategori</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy-950 dark:text-amber-400 md:text-4xl">
              Laporan apa yang ingin kamu sampaikan?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, index) => (
              <Link
                key={cat.slug}
                href={`/report/${cat.slug}`}
                className={`group animate-fade-in-up flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/50 p-6 shadow-md border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(245,158,11,0.15)] dark:hover:shadow-[0_0_40px_rgba(245,158,11,0.1)] hover:border-amber-400 border-l-4 ${cat.accent} opacity-0`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-slate-400 dark:text-slate-500 group-hover:text-navy-950 dark:group-hover:text-amber-500 transition-colors duration-300">{cat.icon}</span>
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">0{index + 1}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-navy-950 dark:text-white mb-3">{cat.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-8">{cat.description}</p>
                </div>
                <div className="flex items-center text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-500">
                  Lapor Sekarang <span className="ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: LAPORAN TERKINI (RECENT REPORTS) WITH SUSPENSE */}
      <section className="py-16 md:py-24 px-6 lg:px-10 bg-slate-100 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <p className="text-sm font-bold tracking-widest text-amber-600 dark:text-amber-500 uppercase mb-3">Wujud Nyata Aksi</p>
              <h2 className="font-display text-3xl font-bold text-navy-950 dark:text-amber-400 md:text-4xl">
                Laporan Terkini
              </h2>
            </div>
            <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              Lihat Semua Laporan &rarr;
            </Link>
          </div>

          <Suspense fallback={<RecentReportsSkeleton />}>
            <RecentReports />
          </Suspense>

        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section className="py-24 px-6 lg:px-10 relative overflow-hidden bg-white dark:bg-slate-900/30">
        <div className="absolute inset-0 bg-noise opacity-[0.02] dark:opacity-5 pointer-events-none mix-blend-overlay"></div>
        <div className="mx-auto max-w-7xl relative z-10 py-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-navy-950 dark:text-amber-400 md:text-4xl">Gimana cara kerjanya?</h2>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-transparent border-t-2 border-dashed border-slate-300 dark:border-slate-700"></div>
            
            <div className="grid gap-12 md:grid-cols-3 relative">
              {[
                { 
                  title: 'Pilih Kategori', 
                  desc: 'Tentukan jenis isu yang sesuai dengan laporanmu.',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  )
                },
                { 
                  title: 'Isi Formulir', 
                  desc: 'Ceritakan detailnya secara anonim atau terbuka.',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  )
                },
                { 
                  title: 'Pantau Status', 
                  desc: 'Gunakan kode tiket untuk melacak progres redaksi.',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  )
                }
              ].map((step, idx) => (
                <div key={idx} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 text-slate-600 dark:text-slate-300">
                    {step.icon}
                    <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white font-bold border-2 border-white dark:border-slate-900 shadow-sm">
                      {idx + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-navy-950 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: FAQ & IDENTITAS */}
      <section className="py-24 px-6 lg:px-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-950">
        <div className="mx-auto max-w-7xl grid gap-16 lg:grid-cols-2">
          
          {/* IDENTITAS */}
          <div className="space-y-12">
            <div>
              <blockquote className="font-display text-3xl font-bold italic leading-tight text-navy-950 dark:text-white md:text-5xl">
                "Suara Inovasi, Titik Temu Aspirasi, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-200 inline-block pr-1 pb-1">Wujud Nyata Aksi</span>"
              </blockquote>
            </div>
            
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Makna Nama</p>
                <h3 className="font-display text-2xl font-bold text-navy-950 dark:text-white">INTERAKSI</h3>
              </div>
              
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  <div>
                    <strong className="text-navy-950 dark:text-white">IN (Inovasi):</strong>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Jurnalisme mahasiswa berbasis data, visual, dan teknologi.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  <div>
                    <strong className="text-navy-950 dark:text-white">TERA (ITERA):</strong>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Identitas sebagai bagian dari sivitas akademika Institut Teknologi Sumatera.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  <div>
                    <strong className="text-navy-950 dark:text-white">AKSI (Action):</strong>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Setiap konten diarahkan menghasilkan output nyata dan pengawalan kebijakan.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-2">Tanya Jawab</p>
              <h3 className="font-display text-2xl font-bold text-navy-950 dark:text-white">Pertanyaan Umum</h3>
            </div>
            
            <div className="space-y-4">
              {[
                { 
                  q: "Apakah identitas saya benar-benar aman?", 
                  a: "Tentu saja. Anda bisa memilih mode pelaporan 'Anonim'. UKM Lembaga Pers ITERA memegang teguh asas perlindungan narasumber sesuai Kode Etik Jurnalistik."
                },
                { 
                  q: "Berapa lama laporan saya akan diproses?", 
                  a: "Tim redaksi akan melakukan verifikasi awal maksimal 2x24 jam kerja. Anda bisa terus memantau status terkini menggunakan Kode Tiket Anda."
                },
                { 
                  q: "Apakah semua laporan akan diterbitkan menjadi berita?", 
                  a: "Tidak selalu. Laporan akan diverifikasi dan diinvestigasi terlebih dahulu. Beberapa laporan yang valid namun bersifat internal akan diteruskan langsung ke pihak kampus sebagai audiensi/advokasi (Arsip Internal)."
                },
                { 
                  q: "Bagaimana jika tiket saya hilang?", 
                  a: "Sistem kami akan menampilkan pop-up notifikasi khusus setelah Anda mengirim laporan. Anda wajib menyalin kode tiket tersebut sebelum menutup jendela informasi demi menjaga anonimitas absolut, karena kode tidak dapat dipulihkan jika hilang."
                }
              ].map((faq, idx) => (
                <details key={idx} className="group border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden cursor-pointer open:ring-2 open:ring-amber-500/20 transition-all">
                  <summary className="flex items-center justify-between font-bold text-navy-950 dark:text-white p-5 select-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <span>{faq.q}</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>



        {/* Identitas Warna */}
        <div className="mt-16 border-t border-slate-200 dark:border-slate-800 pt-16 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h3 className="font-display text-2xl font-bold text-navy-950 dark:text-white">Filosofi Warna</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Setiap palet warna INTERAKSI dirancang untuk merepresentasikan nilai-nilai inti dari UKM Lembaga Pers ITERA.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white dark:bg-white p-6 shadow-md border border-slate-200 dark:border-white transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/20 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner group-hover:scale-110 transition-transform"></div>
                <h4 className="font-bold text-lg text-navy-950 dark:text-navy-950">Deep Purple & Indigo</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-600 leading-relaxed">Melambangkan <strong className="text-indigo-600">independensi, kreativitas, dan wibawa</strong> lembaga pers dalam menyajikan sudut pandang yang tajam dan tak memihak.</p>
            </div>
            
            <div className="rounded-2xl bg-white dark:bg-white p-6 shadow-md border border-slate-200 dark:border-white transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-amber-500/20 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-inner group-hover:scale-110 transition-transform"></div>
                <h4 className="font-bold text-lg text-navy-950 dark:text-navy-950">Amber Orange</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-600 leading-relaxed">Merepresentasikan <strong className="text-amber-600">energi dan keberanian</strong> redaksi dalam merangkul aspirasi mahasiswa serta memperjuangkan kebenaran.</p>
            </div>
            
            <div className="rounded-2xl bg-white dark:bg-white p-6 shadow-md border border-slate-200 dark:border-white transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/20 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-800 to-navy-950 shadow-inner group-hover:scale-110 transition-transform"></div>
                <h4 className="font-bold text-lg text-navy-950 dark:text-navy-950">Navy Blue</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-600 leading-relaxed">Pondasi dari <strong className="text-blue-800">kepercayaan, integritas, dan profesionalitas</strong> jurnalistik yang selalu dijunjung tinggi dalam setiap publikasi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FOOTER */}
      <footer className="bg-slate-100 dark:bg-slate-900 pt-16 pb-8 px-6 lg:px-10 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl grid gap-10 md:grid-cols-3 mb-12">
          {/* Col 1 */}
          <div>
            <div className="inline-flex rounded-xl bg-white dark:bg-white px-4 py-2 mb-4 shadow-sm border border-slate-200 dark:border-white">
              <Image
                src="/images/LOGO-INTERAKSI.png"
                alt="Logo INTERAKSI"
                width={140}
                height={40}
                className="h-6 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Platform pelaporan isu kampus yang dikelola independen oleh UKM Lembaga Pers ITERA.
            </p>
          </div>
          
          {/* Col 2 */}
          <div className="md:ml-auto">
            <h4 className="text-sm font-bold text-navy-950 dark:text-white mb-4">Navigasi</h4>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Beranda</Link></li>
              <li><Link href="/dashboard" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Command Center</Link></li>
              <li><Link href="/lacak" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Lacak Laporan</Link></li>
              <li><Link href="/admin" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Admin Dashboard</Link></li>
              <li><Link href="/bantuan" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Bantuan</Link></li>
            </ul>
          </div>
          
          {/* Col 3 */}
          <div className="md:ml-auto">
            <h4 className="text-sm font-bold text-navy-950 dark:text-white mb-4">UKM Lembaga Pers ITERA</h4>
            <div className="inline-flex rounded-xl bg-white dark:bg-white px-2 py-2 mb-4 border border-slate-200 dark:border-white shadow-sm">
              <Image
                src="/images/lempers-flag.png"
                alt="Bendera UKM Lembaga Pers ITERA"
                width={48}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/lembagapers_itera?igsh=MW45MnZhNWN2M2ptdQ==" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 transition-all hover:scale-110" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://medium.com/@lembagapersitera" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-navy-950 dark:hover:text-white transition-all hover:scale-110" aria-label="Medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.82 6.82 0 010 12a6.82 6.82 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.41-3.38 6.41s-3.38-2.87-3.38-6.41 1.51-6.41 3.38-6.41 3.38 2.87 3.38 6.41zM24 12c0 3.17-.39 5.75-.86 5.75s-.86-2.58-.86-5.75.39-5.75.86-5.75S24 8.83 24 12z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@lembagapers_itera?_r=1&_t=ZS-95p2oXqIgYK" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-navy-950 dark:hover:text-white transition-all hover:scale-110" aria-label="TikTok">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.36-.54.38-.89.98-1.03 1.64-.17.81.12 1.64.71 2.21.5.46 1.16.65 1.83.58.94-.08 1.76-.81 1.93-1.74.01-3.13-.01-6.26.01-9.39zm0 0"/></svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="mx-auto max-w-7xl pt-8 border-t border-slate-200 dark:border-slate-800 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} INTERAKSI &middot; UKM Lembaga Pers ITERA</p>
          <p>Dibuat untuk kebaikan kampus.</p>
        </div>
      </footer>
    </main>
  );
}