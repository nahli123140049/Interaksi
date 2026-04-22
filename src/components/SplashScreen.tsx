'use client';

import { useEffect, useState } from 'react';

const FULL_TEXT = 'INTERAKSI';

export function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    const hasShown = sessionStorage.getItem('splashShown');
    if (hasShown) {
      setShowSplash(false);
      return;
    }

    sessionStorage.setItem('splashShown', 'true');

    // Typewriter: tambah 1 karakter tiap 100ms
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      charIndex += 1;
      setDisplayedText(FULL_TEXT.slice(0, charIndex));
      if (charIndex >= FULL_TEXT.length) {
        clearInterval(typeInterval);
      }
    }, 100);

    // Fade out setelah 2 detik
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Unmount setelah fade selesai
    const unmountTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      clearInterval(typeInterval);
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!isMounted || !showSplash) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a] transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* SVG Logo Pers */}
        <div className="text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-20 w-20"
          >
            <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M3 15h6" />
            <path d="M3 18h6" />
            <path d="M14 13h-4" />
            <path d="M14 17h-4" />
            <rect x="2" y="12" width="8" height="8" rx="1" fill="#d97706" stroke="none" />
          </svg>
        </div>

        {/* Teks Typewriter — JS-driven, tidak hardcode steps() */}
        <div className="flex items-center gap-1 min-h-[3rem]">
          <span className="font-display text-4xl font-bold tracking-[0.4em] text-white">
            {displayedText}
          </span>
          <span className="inline-block w-0.5 h-9 bg-amber-500 animate-pulse" />
        </div>

        {/* Tagline fade in setelah teks selesai */}
        <div
          className="text-sm font-semibold text-slate-300 transition-opacity duration-500"
          style={{ opacity: displayedText.length === FULL_TEXT.length ? 1 : 0 }}
        >
          Inovasi &middot; Terintegrasi &middot; Aksi
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-800">
        <div
          className="h-full bg-[#d97706] origin-left"
          style={{ animation: 'fill-bar 1.8s ease-out forwards' }}
        />
      </div>
    </div>
  );
}
