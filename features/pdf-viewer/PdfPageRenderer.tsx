'use client';

import { useEffect, useRef, useState } from 'react';

interface PdfPageRendererProps {
  file: File;
  pageIndex: number;
  scale: number;
  className?: string;
  onDimensionsChange?: (width: number, height: number) => void;
}

export function PdfPageRenderer({
  file,
  pageIndex,
  scale,
  className,
  onDimensionsChange,
}: PdfPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDimensionsRef = useRef(onDimensionsChange);
  useEffect(() => { onDimensionsRef.current = onDimensionsChange; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    const render = async () => {
      setRendered(false);
      setError(null);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(pageIndex + 1);
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        const cssWidth = viewport.width;
        const cssHeight = viewport.height;

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        onDimensionsRef.current?.(cssWidth, cssHeight);

        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled) return;

        ctx.scale(dpr, dpr);

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        if (!cancelled) setRendered(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('cancel')) return;
        console.error('[PdfPageRenderer]', msg);
        setError(msg);
        setRendered(true);
      }
    };

    render();

    return () => {
      cancelled = true;
      try { renderTask?.cancel(); } catch { /* ignore */ }
    };
  }, [file, pageIndex, scale]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          opacity: rendered ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      />
      {!rendered && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-surface)',
          minHeight: 400,
        }}>
          <div style={{ textAlign: 'center', color: 'var(--color-text-disabled)' }}>
            <div
              className="animate-spin"
              style={{
                width: 24, height: 24,
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                margin: '0 auto 8px',
              }}
            />
            <p style={{ fontSize: 12 }}>Rendering…</p>
          </div>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fef2f2', minHeight: 200,
        }}>
          <p style={{ fontSize: 12, color: 'var(--color-danger)', padding: '0 16px', textAlign: 'center' }}>
            ⚠ Render error: {error}
          </p>
        </div>
      )}
    </div>
  );
}