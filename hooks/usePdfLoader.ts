'use client';

import { useState, useCallback } from 'react';
import type { PdfDocument } from '@/types';

interface UsePdfLoaderReturn {
  loading: boolean;
  error: string | null;
  loadPdf: (file: File) => Promise<PdfDocument | null>;
}

export function usePdfLoader(): UsePdfLoaderReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPdf = useCallback(async (file: File): Promise<PdfDocument | null> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF files are supported.');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;

      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const page = await pdf.getPage(i + 1);
          const viewport = page.getViewport({ scale: 1 });
          return { index: i, width: viewport.width, height: viewport.height };
        })
      );

      return { file, numPages: pdf.numPages, pages };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load PDF';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, loadPdf };
}