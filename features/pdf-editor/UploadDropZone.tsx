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
    e.preventDefault(); setIsDragging(false);
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
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <div
        className="w-full flex flex-col items-center text-center"
        style={{ maxWidth: 420 }}
      >
        {/* ── Icon ── */}
        <div
          className="flex items-center justify-center rounded-2xl mb-5 transition-all"
          style={{
            width: 'clamp(64px, 18vw, 80px)',
            height: 'clamp(64px, 18vw, 80px)',
            background: isDragging ? '#EEF2FF' : 'var(--color-background)',
            border: `1.5px solid ${isDragging ? '#C7D2FE' : 'var(--color-border)'}`,
          }}
        >
          {isDragging
            ? <Upload className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            : <FileText className="w-8 h-8" style={{ color: 'var(--color-text-secondary)' }} />}
        </div>

        {/* ── Heading ── */}
        <p
          className="font-semibold mb-1"
          style={{
            fontSize: 'clamp(16px, 4.5vw, 20px)',
            color: 'var(--color-text-primary)',
          }}
        >
          {isDragging ? 'Lepaskan PDF di sini' : 'Mulai dengan upload PDF'}
        </p>
        <p
          className="mb-6 hidden sm:block"
          style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}
        >
          Drag &amp; drop atau klik untuk memilih file
        </p>

        {/* ── CTA Button (mobile-first: large tap target) ── */}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className="flex items-center justify-center gap-2 w-full rounded-2xl font-semibold transition-all active:scale-95 mb-4"
          style={{
            height: 'clamp(52px, 14vw, 60px)',
            fontSize: 'clamp(15px, 4vw, 17px)',
            background: 'var(--color-primary)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(67,56,202,0.30)',
            maxWidth: 360,
            WebkitTapHighlightColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Upload className="w-5 h-5" />
          Pilih File PDF
        </button>

        {/* ── Size hint ── */}
        <p style={{ fontSize: 11, color: 'var(--color-text-disabled)', marginBottom: 24 }}>
          Mendukung file PDF hingga 50MB
        </p>

        {/* ── Feature chips ── */}
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