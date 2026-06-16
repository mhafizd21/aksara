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

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(pageIndex + 1);
        if (cancelled) return;

        // Use devicePixelRatio to render at native resolution — fixes blurry/pecah rendering
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        // CSS size = viewport size (what layout sees)
        const cssWidth = viewport.width;
        const cssHeight = viewport.height;

        // Physical canvas size = CSS size × DPR (actual pixels)
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);

        // CSS display size stays at logical pixels so layout is unaffected
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        // Report CSS dimensions (not physical) so overlay positioning stays correct
        onDimensionsRef.current?.(cssWidth, cssHeight);

        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled) return;

        // Scale context so PDF renders at full DPR resolution
        ctx.scale(dpr, dpr);

        const hiDpiViewport = page.getViewport({ scale });
        renderTask = page.render({ canvas, canvasContext: ctx, viewport: hiDpiViewport });
        await renderTask.promise;

        if (!cancelled) setRendered(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('cancel') || msg.includes('Cancel')) return;
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
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f9fafb',
            minHeight: 400,
          }}
        >
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p style={{ fontSize: 13 }}>Rendering page…</p>
          </div>
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', minHeight: 200 }}>
          <p style={{ fontSize: 12, color: '#ef4444', padding: '0 16px', textAlign: 'center' }}>
            ⚠ Render error: {error}
          </p>
        </div>
      )}
    </div>
  );
}