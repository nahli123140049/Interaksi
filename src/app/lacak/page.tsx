'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { StatusBadge } from '@/components/StatusBadge';
import { getSlaMeta, getReportCategoryTitle } from '@/lib/reportUtils';

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
  const [reportData, setReportData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

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
        .from('reports')
        .select('id, created_at, category, status, description, additional_data')
        .eq('additional_data->>report_code', code)
        .single();

      if (error || !data) {
        setErrorMsg('Kode tiket tidak ditemukan. Pastikan kode yang kamu masukkan benar.');
      } else {
        setReportData(data);
      }
    } catch (err: any) {
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
    <div className="w-full max-w-2xl mx-auto glass-panel p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 mb-6 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-navy-950">Lacak Status Laporan</h1>
        <p className="mt-3 text-slate-600">Masukkan kode tiket untuk memantau progres laporanmu secara real-time.</p>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(ticketCode);
        }} 
        className="flex flex-col sm:flex-row gap-4 mb-10"
      >
        <input
          type="text"
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value)}
          placeholder="Masukkan kode tiket, contoh: FI-ABC12"
          className="flex-1 rounded-full border border-slate-300 bg-white/80 px-6 py-4 text-base font-medium text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 uppercase"
        />
        <button
          type="submit"
          disabled={!ticketCode.trim() || isLoading}
          className="rounded-full bg-navy-900 px-8 py-4 font-bold text-white transition hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? 'Mencari...' : 'Cari Laporan'}
        </button>
      </form>

      {/* SKELETON */}
      {isLoading && (
        <div className="animate-pulse space-y-6 border-t border-slate-200 pt-8">
          <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
      )}

      {/* NOT FOUND ERROR */}
      {!isLoading && hasSearched && errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center animate-fade-in-up">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-rose-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-rose-800 font-medium">{errorMsg}</p>
        </div>
      )}

      {/* FOUND RESULT */}
      {!isLoading && reportData && (
        <div className="border-t border-slate-200 pt-8 animate-fade-in-up space-y-8">
          {/* Header Data */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Kode Tiket</p>
              <p className="font-mono text-xl font-bold text-navy-950">{reportData.additional_data?.report_code}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Tanggal Masuk</p>
              <p className="font-medium text-slate-900">{new Date(reportData.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm overflow-x-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Progres Redaksi</p>
            <div className="flex justify-between items-center min-w-[400px]">
              {TRACKING_STEPS.map((step, idx) => {
                const isActive = idx === currentStep || (isFinal && idx === 3);
                const isPassed = idx < currentStep || (isFinal && idx <= 3);
                
                return (
                  <div key={idx} className="relative flex flex-col items-center flex-1">
                    {/* Line Connector */}
                    {idx !== TRACKING_STEPS.length - 1 && (
                      <div className={`absolute top-4 left-1/2 w-full h-1 -z-10 ${isPassed ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                    )}
                    
                    {/* Circle */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 mb-3 bg-white z-10 transition-colors
                      ${isPassed || isActive ? 'border-amber-500 text-amber-600' : 'border-slate-200 text-slate-300'}
                      ${isActive ? 'ring-4 ring-amber-100 bg-amber-50' : ''}
                    `}>
                      {isPassed && !isActive ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-bold">{idx + 1}</span>
                      )}
                    </div>
                    
                    <span className={`text-xs font-bold text-center ${isActive ? 'text-amber-700' : isPassed ? 'text-slate-700' : 'text-slate-400'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Status Laporan</p>
                <div className="mt-1"><StatusBadge status={reportData.status} /></div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Target SLA</p>
                {(() => {
                  const sla = getSlaMeta(reportData.created_at, reportData.status);
                  return (
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider
                      ${sla.tone === 'emerald' ? 'bg-emerald-100 text-emerald-800' : 
                        sla.tone === 'amber' ? 'bg-amber-100 text-amber-800' : 
                        sla.tone === 'rose' ? 'bg-rose-100 text-rose-800' : 
                        'bg-cyan-100 text-cyan-800'}`}>
                      {sla.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Kategori Laporan</p>
              <p className="text-sm font-medium text-slate-900 mb-5">{getReportCategoryTitle(reportData.category)}</p>
              
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Deskripsi Singkat</p>
              <p className="text-sm leading-relaxed text-slate-700 line-clamp-3">{reportData.description}</p>
            </div>

            {/* Redaksi Note */}
            {reportData.additional_data?.redaksi_note && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-2">Catatan Redaksi</p>
                    <p className="text-sm leading-relaxed text-amber-900">{reportData.additional_data.redaksi_note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-center pt-4">
            <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-navy-900 transition-colors">
              &larr; Kembali ke Beranda
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 overflow-hidden relative flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] h-[50vh] w-[50vw] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-amber-100/50 blur-[100px] pointer-events-none"></div>
      
      <div className="w-full absolute top-6 left-6 z-20">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-navy-900 transition-colors bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-200">
          &larr; Beranda
        </Link>
      </div>

      <Suspense fallback={
        <div className="w-full max-w-2xl mx-auto glass-panel p-12 rounded-[2.5rem] shadow-2xl flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        </div>
      }>
        <TrackerContent />
      </Suspense>
    </main>
  );
}
