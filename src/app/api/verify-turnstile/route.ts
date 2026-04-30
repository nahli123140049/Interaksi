import { NextResponse } from 'next/server';

/**
 * INTERAKSI Turnstile Verification API
 * 
 * Memverifikasi token CAPTCHA dari client ke server Cloudflare.
 */

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      // Jika secret key tidak ada, kita anggap bypass (untuk development awal)
      console.warn('TURNSTILE_SECRET_KEY is not configured. Bypassing verification.');
      return NextResponse.json({ success: true, warning: 'Bypassed' });
    }

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
    }

    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = await result.json();

    if (outcome.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid CAPTCHA token' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
