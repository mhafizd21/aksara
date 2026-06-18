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
    { icon: PenLine, label: 'Sign' },
    { icon: Type, label: 'Add text' },
    { icon: Calendar, label: 'Add dates' },
    { icon: Download, label: 'Export' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--color-surface)' }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="w-full max-w-md flex flex-col items-center gap-6 p-12 rounded-2xl cursor-pointer transition-all text-center"
        style={{
          background: 'var(--color-background)',
          border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
          boxShadow: isDragging ? '0 0 0 4px rgba(67,56,202,0.08)' : 'none',
        }}>
        <input ref={inputRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
          style={{ background: isDragging ? '#EEF2FF' : 'var(--color-surface)', border: `1px solid ${isDragging ? '#C7D2FE' : 'var(--color-border)'}` }}>
          {isDragging
            ? <Upload className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            : <FileText className="w-7 h-7" style={{ color: 'var(--color-text-secondary)' }} />}
        </div>

        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isDragging ? 'Drop your PDF here' : 'Upload a PDF to get started'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Drag & drop or click to browse</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {features.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              <Icon className="w-3 h-3" />{label}
            </span>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>Supports PDF files up to 50MB</p>
      </div>
    </div>
  );
}