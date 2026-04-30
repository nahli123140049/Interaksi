'use client';

import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  siteKey?: string;
}

declare global {
  interface Window {
    onloadTurnstileCallback: () => void;
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

export function TurnstileWidget({ onVerify, siteKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Jika tidak ada siteKey, jangan render
    if (!siteKey) return;

    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          'error-callback': (err: any) => console.error('Turnstile Error Code:', err),
          'expired-callback': () => console.warn('Turnstile Token Expired'),
          theme: 'auto',
        });
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      script.onload = renderWidget;
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, siteKey]);

  if (!siteKey) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
          Turnstile CAPTCHA Belum Dikonfigurasi
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
