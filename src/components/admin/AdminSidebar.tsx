'use client';

import Link from 'next/link';
import Image from 'next/image';

type TabName = 'reports' | 'berita' | 'analytics' | 'audit';

type AdminSidebarProps = {
  currentTab: TabName;
  onTabChange: (tab: TabName) => void;
  adminEmail: string;
  adminRole: string;
  onLogout: () => void;
  availableTabs: Array<{ id: TabName; label: string }>;
  isOpen: boolean;
  onClose: () => void;
};

export function AdminSidebar({
  currentTab,
  onTabChange,
  adminEmail,
  adminRole,
  onLogout,
  availableTabs,
  isOpen,
  onClose
}: AdminSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-[55] transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-navy-950 text-white z-[60] flex flex-col border-r border-white/5 shadow-2xl overflow-hidden transition-transform duration-500 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-600 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="p-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-white rounded-xl p-2 shadow-lg transition-transform group-hover:scale-105">
            <Image 
              src="/images/lempers-flag.png" 
              alt="Logo" 
              width={32} 
              height={32} 
              className="h-8 w-auto object-contain" 
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg leading-tight">INTERAKSI</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Control Panel</span>
          </div>
        </Link>
      </div>

      <div className="mt-4 px-6">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-600 flex items-center justify-center font-bold text-sm">
              {adminEmail[0]?.toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate">{adminEmail}</span>
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-tighter">{adminRole}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-10 px-4 flex-1 space-y-1">
        {availableTabs.map((tab) => {
          const Icon = {
            reports: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            ),
            berita: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
            ),
            analytics: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            ),
            audit: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          }[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                currentTab === tab.id
                  ? 'bg-amber-500 text-navy-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`transition-transform group-hover:scale-110 ${currentTab === tab.id ? 'text-navy-950' : 'text-slate-400 group-hover:text-amber-500'}`}>
                {Icon}
              </div>
              {tab.label.split(' ').slice(1).join(' ')}
              {currentTab === tab.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-navy-950 animate-pulse"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-slate-400 font-bold text-sm hover:bg-rose-600/10 hover:text-rose-500 border border-white/5 transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 transition-transform group-hover:-translate-x-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Logout Session
        </button>
      </div>
    </aside>
    </>
  );
}
