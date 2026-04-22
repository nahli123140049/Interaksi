'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { PageShell } from '@/components/PageShell';

type NewsItem = {
  id: string;
  created_at: string;
  title: string;
  summary: string | null;
  content: string;
  image_urls: string[] | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function isNewsTableMissingError(message: string) {
  return /relation .*news_posts.* does not exist|Could not find the table 'public.news_posts' in the schema cache/i.test(message);
}

export default function DashboardNewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const modalDepthRef = useRef(0);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setError('');

      const result = await supabase
        .from('news_posts')
        .select('id, created_at, title, summary, content, image_urls')
        .order('created_at', { ascending: false })
        .limit(50);

      if (result.error) {
        if (isNewsTableMissingError(result.error.message)) {
          setError('Berita terkini belum aktif. Jalankan migration database terbaru.');
        } else {
          setError(result.error.message);
        }
        setNewsItems([]);
        setLoading(false);
        return;
      }

      setNewsItems((result.data ?? []) as NewsItem[]);
      setLoading(false);
    };

    loadNews();
  }, []);

  const closeNewsModal = useCallback(() => {
    setSelectedNews(null);
  }, []);

  const requestCloseNewsModal = useCallback(() => {
    if (typeof window !== 'undefined' && modalDepthRef.current > 0) {
      window.history.back();
      return;
    }

    closeNewsModal();
  }, [closeNewsModal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (selectedNews && modalDepthRef.current === 0) {
      window.history.pushState({ __modal: 'dashboard-news' }, '', window.location.href);
      modalDepthRef.current = 1;
      return;
    }

    if (!selectedNews && modalDepthRef.current > 0) {
      modalDepthRef.current = 0;
    }
  }, [selectedNews]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalDepthRef.current > 0) {
        event.preventDefault();
        requestCloseNewsModal();
      }
    };

    const handlePopState = () => {
      if (modalDepthRef.current > 0) {
        closeNewsModal();
        modalDepthRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeNewsModal, requestCloseNewsModal]);

  const featuredNews = newsItems[0] ?? null;
  const headlineNews = newsItems.slice(1);

  return (
    <PageShell>
      <main className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 dark:text-slate-100 md:px-6 lg:px-10">
        {/* Immersive Background Elements */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-amber-200/20 blur-[120px] dark:bg-amber-900/10" />
          <div className="absolute -right-[5%] top-[20%] h-[600px] w-[600px] rounded-full bg-navy-200/20 blur-[120px] dark:bg-navy-900/10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:invert" />
        </div>

        <div className="mx-auto max-w-7xl space-y-10">
          <header className="reveal-fade relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/40">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
            
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-1 w-12 rounded-full bg-amber-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Berita Terkini</p>
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-navy-950 dark:text-white md:text-6xl">Rilis & <span className="text-amber-600">Investigasi</span></h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                  Kumpulan publikasi eksklusif hasil investigasi tim redaksi berdasarkan aspirasi publik yang telah tervalidasi.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['Eksklusif', 'Investigasi', 'Valid'].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/80 bg-white/50 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-amber-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/50 px-6 py-3.5 text-sm font-bold text-slate-700 backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/pusat-data"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-800 hover:scale-105 active:scale-95"
                >
                  Pusat Data Aspirasi
                </Link>
              </div>
            </div>
          </header>

          <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Berita...</p>
            </div>
          ) : error ? (
            <div className="rounded-[2.5rem] border border-rose-200 bg-rose-50/50 p-8 backdrop-blur-sm text-rose-700 font-medium">
              {error}
            </div>
          ) : newsItems.length === 0 ? (
            <div className="rounded-[2.5rem] border border-white/40 bg-white/20 p-12 text-center backdrop-blur-sm">
              <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada berita yang dipublikasikan saat ini.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {featuredNews && (
                <article className="group relative overflow-hidden rounded-[3rem] border border-white/60 bg-white/40 shadow-2xl transition-all duration-500 hover:-translate-y-2 dark:border-slate-800/50 dark:bg-slate-950/40">
                  <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="relative min-h-[340px] overflow-hidden bg-slate-100">
                      {featuredNews.image_urls?.[0] ? (
                        <img src={featuredNews.image_urls[0]} alt={featuredNews.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">Liputan Redaksi</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div className="relative flex flex-col p-10 lg:p-12">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-1 w-8 rounded-full bg-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Headline</p>
                      </div>
                      <h2 className="font-display text-3xl font-bold text-navy-950 dark:text-white leading-tight">{featuredNews.title}</h2>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDate(featuredNews.created_at)}</p>
                      <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400 flex-grow">
                        {featuredNews.summary || (featuredNews.content.length > 220 ? `${featuredNews.content.slice(0, 220)}...` : featuredNews.content)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNews(featuredNews);
                          setSelectedImageIndex(0);
                        }}
                        className="mt-10 inline-flex items-center justify-center rounded-full bg-navy-950 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-navy-800 hover:shadow-xl active:scale-95 dark:bg-white dark:text-navy-950"
                      >
                        Baca Selengkapnya
                      </button>
                    </div>
                  </div>
                </article>
              )}

              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {headlineNews.map((news) => (
                  <article key={news.id} className="group flex flex-col overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800/50 dark:bg-slate-900/40">
                    {news.image_urls?.[0] && (
                      <div className="mb-6 h-52 w-full overflow-hidden rounded-[1.75rem]">
                        <img
                          src={news.image_urls[0]}
                          alt={news.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{formatDate(news.created_at)}</p>
                    <h2 className="font-display text-xl font-bold text-navy-950 dark:text-white line-clamp-2 mb-4 group-hover:text-amber-600 transition-colors">{news.title}</h2>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3 mb-8">
                      {news.summary || (news.content.length > 140 ? `${news.content.slice(0, 140)}...` : news.content)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNews(news);
                        setSelectedImageIndex(0);
                      }}
                      className="mt-auto inline-flex items-center justify-center rounded-full border border-white/60 bg-white/50 px-6 py-3 text-xs font-bold text-slate-700 backdrop-blur-sm transition-all hover:bg-white hover:border-amber-400 hover:text-amber-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-amber-500 dark:hover:text-amber-500"
                    >
                      Buka Artikel
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 py-6 backdrop-blur-md transition-all animate-in fade-in duration-300"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseNewsModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[3rem] border border-white/40 bg-white/95 p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 dark:border-slate-800/50 dark:bg-slate-950/95 lg:p-12">
            <div className="flex items-start justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-1 w-6 rounded-full bg-amber-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Rilis Investigasi</p>
                </div>
                <h3 className="font-display text-3xl font-bold text-navy-950 dark:text-white leading-tight">{selectedNews.title}</h3>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDate(selectedNews.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => requestCloseNewsModal()}
                className="h-12 w-12 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                ✕
              </button>
            </div>

            {selectedNews.image_urls && selectedNews.image_urls.length > 0 && (
              <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/40 bg-slate-50 dark:bg-slate-900 p-4">
                <div className="relative group">
                  <img
                    src={selectedNews.image_urls[selectedImageIndex]}
                    alt={`Foto berita ${selectedImageIndex + 1}`}
                    className="h-[400px] w-full rounded-2xl bg-slate-100 object-cover"
                  />

                  {selectedNews.image_urls.length > 1 && (
                    <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImageIndex((current) =>
                            (current - 1 + selectedNews.image_urls!.length) % selectedNews.image_urls!.length
                          )
                        }
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/90 shadow-xl text-navy-950 transition hover:scale-110"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImageIndex((current) => (current + 1) % selectedNews.image_urls!.length)
                        }
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/90 shadow-xl text-navy-950 transition hover:scale-110"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>

                {selectedNews.image_urls.length > 1 && (
                  <div className="mt-4 flex justify-center gap-2">
                    {selectedNews.image_urls.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          idx === selectedImageIndex ? 'w-12 bg-amber-500' : 'w-2 bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-10">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-lg leading-[2.2rem] text-slate-700 dark:text-slate-300">
                  {selectedNews.content}
                </p>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={() => requestCloseNewsModal()}
                className="rounded-full bg-navy-950 px-10 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-navy-800 dark:bg-white dark:text-navy-950"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </PageShell>
  );
}
