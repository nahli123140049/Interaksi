'use client';

import { useCallback, useState } from 'react';

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  error?: string;
  url?: string;
}

interface ImageUploadManagerProps {
  onImagesUploaded?: (urls: string[]) => void;
  onFilesChange?: (files: File[]) => void;
  maxImages?: number;
  maxSizePerImage?: number;
  currentImages?: string[];
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_TIMEOUT = 45000; // 45 seconds

export function ImageUploadManager({
  onImagesUploaded,
  onFilesChange,
  maxImages = 5,
  maxSizePerImage = MAX_IMAGE_SIZE,
  currentImages = []
}: ImageUploadManagerProps) {
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const compressImage = useCallback(async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxWidth = 2000;
        const maxHeight = 2000;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          0.8
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileSelection = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const newUploads: UploadedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validation
        if (!file.type.startsWith('image/')) {
          newUploads.push({
            id: `${Date.now()}-${i}`,
            file,
            preview: '',
            progress: 0,
            error: 'Hanya file gambar yang diperbolehkan'
          });
          continue;
        }

        if (file.size > maxSizePerImage) {
          newUploads.push({
            id: `${Date.now()}-${i}`,
            file,
            preview: '',
            progress: 0,
            error: `File terlalu besar (max ${Math.round(maxSizePerImage / 1024 / 1024)}MB)`
          });
          continue;
        }

        if (uploads.length + newUploads.length >= maxImages) {
          break;
        }

        // Generate preview
        try {
          const preview = await generatePreview(file);
          newUploads.push({
            id: `${Date.now()}-${i}`,
            file,
            preview,
            progress: 0
          });
        } catch (err) {
          newUploads.push({
            id: `${Date.now()}-${i}`,
            file,
            preview: '',
            progress: 0,
            error: 'Gagal membuat preview'
          });
        }
      }

      const updatedUploads = [...uploads, ...newUploads];
      setUploads(updatedUploads);
      onFilesChange?.(updatedUploads.filter(u => !u.error).map(u => u.file));
      setIsDragging(false);
    },
    [uploads, maxImages, maxSizePerImage, generatePreview, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileSelection(e.dataTransfer.files);
    },
    [handleFileSelection]
  );

  const removeImage = useCallback((id: string) => {
    setUploads((prev) => {
      const filtered = prev.filter((u) => u.id !== id);
      onFilesChange?.(filtered.filter(u => !u.error).map(u => u.file));
      return filtered;
    });
  }, [onFilesChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelection(e.target.files);
    },
    [handleFileSelection]
  );

  const validUploads = uploads.filter((u) => !u.error && u.preview);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:bg-white'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <div className="text-3xl mb-2">📸</div>
          <p className="font-medium text-slate-900">Drag & drop gambar di sini</p>
          <p className="text-sm text-slate-600">atau klik untuk pilih file</p>
          <p className="text-xs text-slate-500 mt-2">
            Max {maxImages} gambar, {Math.round(maxSizePerImage / 1024 / 1024)}MB per file
          </p>
        </label>
      </div>

      {/* Preview Grid */}
      {(validUploads.length > 0 || currentImages.length > 0) && (
        <div>
          <p className="text-sm font-medium text-slate-900 mb-2">
            Gambar ({validUploads.length} baru{currentImages.length > 0 ? ` + ${currentImages.length} lama` : ''})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Current Images */}
            {currentImages.map((url, i) => (
              <div key={`current-${i}`} className="relative group">
                <img
                  src={url}
                  alt={`Current ${i}`}
                  className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg transition flex items-center justify-center">
                  <span className="text-white text-xs font-medium">✓ Tersimpan</span>
                </div>
              </div>
            ))}

            {/* New Uploads */}
            {validUploads.map((upload) => (
              <div key={upload.id} className="relative group">
                <img
                  src={upload.preview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                />
                {upload.progress > 0 && upload.progress < 100 && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-white text-xs font-medium mb-2">
                      {Math.round(upload.progress)}%
                    </div>
                    <div className="w-12 h-1 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {upload.progress === 100 && (
                  <div className="absolute inset-0 bg-emerald-500/50 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                )}
                <button
                  onClick={() => removeImage(upload.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {uploads.some((u) => u.error) && (
        <div className="space-y-1">
          {uploads
            .filter((u) => u.error)
            .map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <p className="text-sm text-red-700">
                  <strong>{upload.file.name}:</strong> {upload.error}
                </p>
                <button
                  onClick={() => removeImage(upload.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Hapus
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
