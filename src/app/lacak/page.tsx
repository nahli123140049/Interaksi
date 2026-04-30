'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { StatusBadge } from '@/components/StatusBadge';
import { getSlaMeta, getReportCategoryTitle } from '@/lib/reportUtils';
import { PageShell } from '@/components/PageShell';

type TrackedReport = {
  id: string;
  created_at: string;
  category: string;
  status: string;
  description: string;
  additional_data: {
    report_code?: string;
    redaksi_note?: string;
    [key: string]: unknown;
  } | null;
};

// Definition of steps as requested
const TRACKING_STEPS = [
  'Menunggu Verifikasi',
  'Proses Investigasi',
  'Arsip/Terbit',
  'Selesai'
];

function getStepIndex(status: string) {
  if (status === 'Menunggu Verifikasi') return 0;
  if (status === 'Proses Investigasi') return 1;
  if (status === 'Arsip Internal' || status === 'Telah Terbit') return 2;
  // If "Ditolak/Tidak Valid" maybe it's just 'Selesai' or special state
  if (status === 'Ditolak/Tidak Valid') return 3;
  return -1;
}

function TrackerContent() {
  const searchParams = useSearchParams();
  const [ticketCode, setTicketCode] = useState(searchParams.get('kode') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [reportData, setReportData] = useState<TrackedReport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSearch = async (codeToSearch: string) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) return;

    setIsLoading(true);
    setHasSearched(true);
    setErrorMsg('');
    setReportData(null);

    if (!isSupabaseConfigured) {
      setErrorMsg('Sistem database belum siap.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('track_report_by_code', { p_code: code })
        .maybeSingle();

      if (error || !data) {
        setErrorMsg('Kode tiket tidak ditemukan. Pastikan kode yang kamu masukkan benar.');
      } else {
        setReportData(data as TrackedReport);
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat mencari tiket.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount if query param exists
  useEffect(() => {
    const kode = searchParams.get('kode');
    if (kode) {
      handleSearch(kode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = reportData ? getStepIndex(reportData.status) : -1;
  const isRejected = reportData?.status === 'Ditolak/Tidak Valid';
  const isFinal = reportData?.status === 'Telah Terbit' || reportData?.status === 'Arsip Internal' || isRejected;

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-[3rem] border border-white/40 bg-white/40 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-500 md:p-12 dark:border-slate-800/50 dark:bg-slate-950/40">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative text-center mb-12">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-500 mb-8 shadow-inner ring-1 ring-amber-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 drop-shadow-sm">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tight text-navy-950 dark:text-white">Lacak <span className="text-amber-600">Laporan</span></h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Gunakan kode tiket untuk melihat perkembangan investigasi redaksi.</p>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(ticketCode);
        }} 
        className="relative group mb-12"
      >
        <div className="relative flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            placeholder="KODE TIKET: FI-ABC12"
            className="flex-1 rounded-[2rem] border border-white/60 bg-white/50 px-8 py-5 text-lg font-black text-navy-950 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-8 focus:ring-amber-500/10 backdrop-blur-sm transition-all uppercase tracking-widest dark:border-slate-800 dark:bg-slate-900/50"
          />
          <button
            type="submit"
            disabled={!ticketCode.trim() || isLoading}
            className="rounded-[2rem] bg-navy-950 px-10 py-5 font-black text-xs uppercase tracking-widest text-white transition-all hover:bg-navy-800 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-navy-950"
          >
            {isLoading ? 'Searching...' : 'Cari Tiket'}
          </button>
        </div>
      </form>

      {/* SKELETON */}
      {isLoading && (
        <div className="animate-pulse space-y-8 border-t border-white/20 pt-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-white/30 rounded-[1.5rem] dark:bg-slate-800/30"></div>
            <div className="h-24 bg-white/30 rounded-[1.5rem] dark:bg-slate-800/30"></div>
          </div>
          <div className="h-40 bg-white/30 rounded-[2rem] dark:bg-slate-800/30"></div>
        </div>
      )}

      {/* NOT FOUND ERROR */}
      {!isLoading && hasSearched && errorMsg && (
        <div className="rounded-[2rem] border border-rose-200/50 bg-rose-50/50 p-10 text-center backdrop-blur-sm animate-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-rose-950 dark:text-rose-200 font-bold text-lg">{errorMsg}</p>
        </div>
      )}

      {/* FOUND RESULT */}
      {!isLoading && reportData && (
        <div className="border-t border-white/20 pt-10 animate-in slide-in-from-bottom-8 duration-500 space-y-10">
          {/* Header Data */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-sm dark:border-slate-800/50 dark:bg-slate-900/50">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">ID Pelacakan</p>
              <p className="font-mono text-2xl font-black text-amber-600 drop-shadow-sm">{reportData.additional_data?.report_code}</p>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-sm dark:border-slate-800/50 dark:bg-slate-900/50">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Tanggal Registrasi</p>
              <p className="text-xl font-bold text-navy-950 dark:text-white">{new Date(reportData.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-sm dark:border-slate-800/50 dark:bg-slate-900/50 overflow-x-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10">Status Perjalanan Laporan</p>
            <div className="flex justify-between items-center min-w-[500px]">
              {TRACKING_STEPS.map((step, idx) => {
                const isActive = idx === currentStep || (isFinal && idx === 3);
                const isPassed = idx < currentStep || (isFinal && idx <= 3);
                
                return (
                  <div key={idx} className="relative flex flex-col items-center flex-1">
                    {/* Line Connector */}
                    {idx !== TRACKING_STEPS.length - 1 && (
                      <div className={`absolute top-5 left-1/2 w-full h-1.5 -z-10 rounded-full ${isPassed ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                    )}
                    
                    {/* Circle */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-4 mb-4 z-10 transition-all duration-500
                      ${isPassed || isActive ? 'border-amber-500 bg-white dark:bg-slate-950 text-amber-600' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-300'}
                      ${isActive ? 'scale-125 ring-8 ring-amber-500/10' : ''}
                    `}>
                      {isPassed && !isActive ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs font-black">{idx + 1}</span>
                      )}
                    </div>
                    
                    <span className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] ${isActive ? 'text-amber-600' : isPassed ? 'text-navy-950 dark:text-white' : 'text-slate-400'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-6">
            <div className="flex items-center justify-between p-6 rounded-[2rem] bg-white/40 border border-white/60 dark:bg-slate-900/50 dark:border-slate-800/50">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status Saat Ini</p>
                <StatusBadge status={reportData.status} />
              </div>
              <div className="text-right flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Respons</p>
                {(() => {
                  const sla = getSlaMeta(reportData.created_at, reportData.status);
                  return (
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest
                      ${sla.tone === 'emerald' ? 'bg-emerald-500/10 text-emerald-600' : 
                        sla.tone === 'amber' ? 'bg-amber-500/10 text-amber-600' : 
                        sla.tone === 'rose' ? 'bg-rose-500/10 text-rose-600' : 
                        'bg-cyan-500/10 text-cyan-600'}`}>
                      {sla.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-sm dark:border-slate-800/50 dark:bg-slate-900/50">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-2xl" />
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Kategori Isu</p>
                <p className="text-lg font-bold text-navy-950 dark:text-white mb-6 uppercase tracking-tight">{getReportCategoryTitle(reportData.category)}</p>
                
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Intisari Laporan</p>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-4">{reportData.description}</p>
              </div>
            </div>

            {/* Redaksi Note */}
            {reportData.additional_data?.redaksi_note && (
              <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-400/30 bg-amber-500/5 p-8 dark:bg-amber-500/5">
                <div className="absolute left-0 top-0 h-full w-2 bg-amber-500" />
                <div className="flex gap-6">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-2">Pesan Dari Redaksi</p>
                    <p className="text-base font-medium leading-relaxed text-amber-950 dark:text-amber-200 italic">"{reportData.additional_data.redaksi_note}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Share Button */}
          <div className="flex flex-col items-center gap-6 pt-6">
            <button
              type="button"
              onClick={async () => {
                const shareUrl = `${window.location.origin}/lacak?kode=${reportData?.additional_data?.report_code ?? ''}`;
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                } catch {
                  setErrorMsg('Gagal menyalin link.');
                }
              }}
              className="group inline-flex items-center gap-3 rounded-full bg-navy-950 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-navy-800 hover:scale-105 active:scale-95 dark:bg-white dark:text-navy-950 shadow-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              {copySuccess ? 'Copied Successfully!' : 'Bagikan Link Tiket'}
            </button>
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-navy-950 dark:hover:text-white transition-colors">
              &larr; Kembali ke Beranda Utama
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <PageShell>
      <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center py-16 px-4">
        {/* Immersive Background Elements */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-blue-200/20 blur-[120px] dark:bg-blue-900/10" />
          <div className="absolute -right-[5%] top-[20%] h-[600px] w-[600px] rounded-full bg-amber-200/20 blur-[120px] dark:bg-amber-900/10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:invert" />
        </div>
        
        <Suspense fallback={
          <div className="w-full max-w-2xl mx-auto rounded-[3rem] border border-white/40 bg-white/40 p-20 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center gap-6">
            <div className="h-16 w-16 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghubungkan Database...</p>
          </div>
        }>
          <TrackerContent />
        </Suspense>
      </main>
    </PageShell>
  );
}
