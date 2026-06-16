'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'w-full max-w-md border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-5',
          'cursor-pointer transition-all text-center',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
        )}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center transition-all',
          isDragging ? 'bg-blue-100' : 'bg-gray-100'
        )}>
          {isDragging
            ? <Upload className="w-8 h-8 text-blue-500" />
            : <FileText className="w-8 h-8 text-gray-400" />
          }
        </div>

        <div>
          <p className="text-base font-semibold text-gray-800">
            {isDragging ? 'Drop your PDF here' : 'Upload your PDF'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Drag & drop or click to browse
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          {['Sign', 'Add text', 'Add dates', 'Download'].map((f) => (
            <span key={f} className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
