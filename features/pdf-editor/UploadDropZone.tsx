'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, PenLine, Calendar, Type, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

      <motion.div
        className="w-full flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ maxWidth: 380 }}
      >
        {/* Unified drop zone + click target */}
        <motion.button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          animate={{
            borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
            background: isDragging ? '#EEF2FF' : 'var(--color-background)',
            scale: isDragging ? 1.015 : 1,
          }}
          whileHover={{ borderColor: 'var(--color-primary)', background: '#F5F7FF' }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          className="w-full flex flex-col items-center rounded-2xl mb-4"
          style={{
            padding: 'clamp(24px, 6vw, 36px) 24px',
            border: '1.5px dashed var(--color-border)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
        >
          {/* Icon — swaps on drag */}
          <motion.div
            animate={{
              background: isDragging ? '#C7D2FE' : 'var(--color-surface)',
              borderColor: isDragging ? '#A5B4FC' : 'var(--color-border)',
              rotate: isDragging ? -8 : 0,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="flex items-center justify-center rounded-xl mb-3"
            style={{ width: 48, height: 48, border: '1px solid var(--color-border)' }}
          >
            <AnimatePresence mode="wait">
              {isDragging ? (
                <motion.div
                  key="upload"
                  initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  <Upload className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  <FileText className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={isDragging ? 'drag' : 'idle'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="font-semibold mb-0.5"
              style={{ fontSize: 15, color: 'var(--color-text-primary)' }}
            >
              {isDragging ? 'Lepaskan di sini' : 'Pilih atau drop file PDF'}
            </motion.p>
          </AnimatePresence>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}
            className="hidden sm:block">
            {isDragging ? '' : 'Klik area ini atau drag & drop'}
          </p>

          {/* CTA pill */}
          <motion.span
            animate={{ background: isDragging ? 'var(--color-primary-hover)' : 'var(--color-primary)' }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium"
            style={{ fontSize: 13, color: '#fff', boxShadow: '0 2px 8px rgba(67,56,202,0.20)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            {isDragging ? 'Lepaskan' : 'Upload PDF'}
          </motion.span>

          <p style={{ fontSize: 11, color: 'var(--color-text-disabled)', marginTop: 10 }}>
            Maks. 50MB
          </p>
        </motion.button>

        {/* Feature chips — staggered fade in */}
        <motion.div
          className="flex flex-wrap justify-center gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
          }}
        >
          {features.map(({ icon: Icon, label }) => (
            <motion.span
              key={label}
              variants={{
                hidden: { opacity: 0, y: 6 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                background: 'var(--color-background)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}