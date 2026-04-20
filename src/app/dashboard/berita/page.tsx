'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

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

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-700">Berita Terkini</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Rilis dan Publikasi Redaksi</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Kumpulan berita yang sudah dipublikasikan dari hasil laporan dan investigasi tim redaksi.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-200 hover:text-amber-900"
              >
                Kembali ke Dashboard
              </Link>
              <Link
                href="/dashboard/pusat-data"
                className="inline-flex items-center justify-center rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
              >
                Buka Pusat Data Aspirasi
              </Link>
            </div>
          </div>
        </header>

        <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Memuat berita...</div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : newsItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Belum ada berita yang dipublikasikan.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {newsItems.map((news) => (
                <article key={news.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  {news.image_urls?.[0] && (
                    <img
                      src={news.image_urls[0]}
                      alt={news.title}
                      className="mb-3 h-44 w-full rounded-xl bg-slate-100 object-cover"
                    />
                  )}
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{formatDate(news.created_at)}</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{news.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {news.summary || (news.content.length > 180 ? `${news.content.slice(0, 180)}...` : news.content)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNews(news);
                      setSelectedImageIndex(0);
                    }}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-200 hover:text-amber-900"
                  >
                    Baca Berita Lengkap
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseNewsModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-soft lg:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Detail Berita</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedNews.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{formatDate(selectedNews.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => requestCloseNewsModal()}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-amber-200 hover:text-amber-900"
              >
                Tutup
              </button>
            </div>

            {selectedNews.image_urls && selectedNews.image_urls.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="relative">
                  <img
                    src={selectedNews.image_urls[selectedImageIndex]}
                    alt={`Foto berita ${selectedImageIndex + 1}`}
                    className="h-72 w-full rounded-xl bg-slate-100 object-contain"
                  />

                  {selectedNews.image_urls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImageIndex((current) =>
                            (current - 1 + selectedNews.image_urls!.length) % selectedNews.image_urls!.length
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImageIndex((current) => (current + 1) % selectedNews.image_urls!.length)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
                      >
                        →
                      </button>
                    </>
                  )}
                </div>

                {selectedNews.image_urls.length > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {selectedNews.image_urls.map((_, index) => (
                      <button
                        key={`${selectedNews.id}-dot-${index}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`h-2.5 rounded-full transition ${
                          selectedImageIndex === index ? 'w-6 bg-amber-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                        }`}
                        aria-label={`Foto ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-800">{selectedNews.content}</div>
          </div>
        </div>
      )}
    </main>
  );
}
