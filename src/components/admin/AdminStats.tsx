'use client';

type AdminStatsProps = {
  totalReports: number;
  backlogCount: number;
  publishedCount: number;
  slaOverdueCount: number;
};

export function AdminStats({
  totalReports,
  backlogCount,
  publishedCount,
  slaOverdueCount
}: AdminStatsProps) {
  const stats = [
    { label: 'Total Laporan', value: totalReports, tone: 'navy', gradient: 'from-slate-800 to-navy-950' },
    { label: 'Belum Selesai', value: backlogCount, tone: 'amber', gradient: 'from-amber-500 to-orange-600' },
    { label: 'Telah Terbit', value: publishedCount, tone: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
    { label: 'SLA Overdue', value: slaOverdueCount, tone: 'rose', gradient: 'from-rose-500 to-pink-600' }
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = {
          'Total Laporan': (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          ),
          'Belum Selesai': (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          'Telah Terbit': (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          'SLA Overdue': (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )
        }[stat.label];

        return (
          <div 
            key={stat.label} 
            className={`group relative overflow-hidden rounded-[2.5rem] p-8 shadow-xl transition-all duration-500 hover:-translate-y-1 bg-gradient-to-br ${stat.gradient} text-white`}
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150" />
            
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                  {Icon}
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{stat.label}</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-black tracking-tight tabular-nums">
                {stat.value.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] opacity-60 font-black uppercase tracking-widest">Entitas</span>
            </div>
            
            <div className="mt-6 flex items-center gap-2">
               <div className="h-1 w-12 rounded-full bg-white/20" />
               <div className="h-1 w-2 rounded-full bg-white/40" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
