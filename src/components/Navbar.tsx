'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Beranda', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Bantuan', href: '/bantuan' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${
          scrolled 
            ? 'bg-white/80 dark:bg-navy-950/80 backdrop-blur-md border-slate-200 dark:border-slate-800 py-3 shadow-sm' 
            : 'bg-transparent border-transparent py-5'
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-white rounded-lg p-1.5 border border-slate-100 shadow-sm">
              <Image 
                src="/images/lempers-flag.png" 
                alt="Logo UKM Lembaga Pers ITERA" 
                width={32} 
                height={32} 
                className="h-7 w-auto object-contain transition-transform group-hover:scale-105" 
              />
            </div>
            <span className="font-display font-bold text-navy-950 dark:text-white hidden sm:block tracking-wide">
              UKM Lembaga Pers <span className="text-rose-600 dark:text-rose-500">ITERA</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <ul className="flex items-center gap-6">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
            <Link 
              href="/lacak" 
              className="rounded-full bg-navy-950 dark:bg-white px-5 py-2 text-sm font-bold text-white dark:text-navy-950 hover:scale-105 transition-transform shadow-sm"
            >
              Lacak Laporan
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-slate-900 dark:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-navy-950 md:hidden pt-24 px-6 flex flex-col gap-6 animate-fade-in-up">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.name}
                href={link.href} 
                className="text-2xl font-display font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Link 
              href="/lacak" 
              className="mt-4 text-center rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white shadow-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Lacak Laporan Anda
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
