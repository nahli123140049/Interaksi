'use client';

import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const hasShown = sessionStorage.getItem('splashShown');
      if (hasShown) {
        setShowSplash(false);
      } else {
        sessionStorage.setItem('splashShown', 'true');
        
        // Start fade out at 2s (2000ms)
        const fadeTimer = setTimeout(() => {
          setIsFadingOut(true);
        }, 2000);

        // Unmount entirely after fade out animation completes (2000ms + 500ms)
        const unmountTimer = setTimeout(() => {
          setShowSplash(false);
        }, 2500);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(unmountTimer);
        };
      }
    }
  }, []);

  if (!isMounted || !showSplash) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a] transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* SVG Logo - Pers / Surat Kabar */}
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

        {/* Teks INTERAKSI Typewriter */}
        <div className="overflow-hidden whitespace-nowrap border-r-2 border-amber-600 font-display text-4xl font-bold tracking-[0.4em] text-white"
             style={{ animation: 'typewriter 1.2s steps(9) forwards, dash-pulse 0.75s step-end infinite' }}>
          INTERAKSI
        </div>

        {/* Tagline */}
        <div className="text-sm font-semibold text-slate-300 opacity-0 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
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
