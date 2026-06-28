'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, PenLine, Calendar, Type, Download } from 'lucide-react';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { useStudioStore } from '@/stores/studio.store';

export function UploadDropZone() {
  const { loadPdf } = usePdfLoader();
  const { setDocument } = useStudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) return;
    const doc = await loadPdf(file);
    if (doc) setDocument(doc);
  }, [loadPdf, setDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const features = [
    { icon: PenLine, label: 'Tanda Tangan' },
    { icon: Type, label: 'Tambah Teks' },
    { icon: Calendar, label: 'Tambah Tanggal' },
    { icon: Download, label: 'Ekspor PDF' },
  ];

  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: 'var(--color-surface)', padding: 'clamp(16px, 5vw, 48px)' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <div className="w-full flex flex-col items-center text-center" style={{ maxWidth: 380 }}>
        {/* Unified drop zone + click target */}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className="w-full flex flex-col items-center rounded-2xl transition-all active:scale-[0.98] mb-4"
          style={{
            padding: 'clamp(24px, 6vw, 36px) 24px',
            border: `1.5px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: isDragging ? '#EEF2FF' : 'var(--color-background)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
            if (!isDragging) (e.currentTarget as HTMLElement).style.background = '#F5F7FF';
          }}
          onMouseLeave={(e) => {
            if (!isDragging) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
            if (!isDragging) (e.currentTarget as HTMLElement).style.background = 'var(--color-background)';
          }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center rounded-xl mb-3 transition-all"
            style={{
              width: 48, height: 48,
              background: isDragging ? '#C7D2FE' : 'var(--color-surface)',
              border: `1px solid ${isDragging ? '#A5B4FC' : 'var(--color-border)'}`,
            }}
          >
            {isDragging
              ? <Upload className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              : <FileText className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />}
          </div>

          {/* Text */}
          <p className="font-semibold mb-1" style={{ fontSize: 15, color: 'var(--color-text-primary)' }}>
            {isDragging ? 'Lepaskan di sini' : 'Pilih atau drop file PDF'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}
            className="hidden sm:block">
            {isDragging ? '' : 'Klik area ini atau drag & drop'}
          </p>

          {/* Inline CTA pill */}
          <span
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium"
            style={{
              fontSize: 13,
              background: isDragging ? 'var(--color-primary)' : 'var(--color-primary)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(67,56,202,0.20)',
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            {isDragging ? 'Lepaskan' : 'Upload PDF'}
          </span>

          <p style={{ fontSize: 11, color: 'var(--color-text-disabled)', marginTop: 10 }}>
            Maks. 50MB
          </p>
        </button>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {features.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                background: 'var(--color-background)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}