import { NextResponse } from 'next/server';

/**
 * INTERAKSI Upload Validation API
 * 
 * Memvalidasi magic bytes (file signature) untuk memastikan file yang
 * diupload benar-benar Gambar atau PDF, bukan skrip berbahaya yang di-rename.
 */

const MAGIC_BYTES = {
  // JPG: FF D8 FF
  jpg: [0xff, 0xd8, 0xff],
  // PNG: 89 50 4E 47
  png: [0x89, 0x50, 0x4e, 0x47],
  // PDF: 25 50 44 46
  pdf: [0x25, 0x50, 0x44, 0x46],
  // MP4: 00 00 00 (biasanya di offset 4 tertulis 'ftyp')
  mp4: [0x66, 0x74, 0x79, 0x70] // 'ftyp'
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Maksimal 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Check JPG
    if (['jpg', 'jpeg'].includes(extension || '')) {
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        return NextResponse.json({ error: 'Invalid JPG signature' }, { status: 400 });
      }
    }
    // Check PNG
    else if (extension === 'png') {
      if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
        return NextResponse.json({ error: 'Invalid PNG signature' }, { status: 400 });
      }
    }
    // Check PDF
    else if (extension === 'pdf') {
      if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        return NextResponse.json({ error: 'Invalid PDF signature' }, { status: 400 });
      }
    }
    // Check MP4 (basic check for 'ftyp' at offset 4)
    else if (['mp4', 'mov'].includes(extension || '')) {
      const isMP4 = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
      if (!isMP4) {
        return NextResponse.json({ error: 'Invalid Video signature' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal validation error' }, { status: 500 });
  }
}
