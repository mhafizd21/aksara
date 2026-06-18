'use client';

import { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studio.store';

interface PdfThumbnailProps {
  file: File; pageIndex: number; isActive: boolean; onClick: () => void;
}

export function PdfThumbnail({ file, pageIndex, isActive, onClick }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pageDims, setPageDims] = useState<{ width: number; height: number } | null>(null);

  const allElements = useStudioStore((s) => s.elements);
  const scale = useStudioStore((s) => s.scale);
  const elements = allElements.filter((el) => el.pageIndex === pageIndex);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const render = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const arrayBuffer = await file.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(pageIndex + 1);
        if (cancelled) return;

        const THUMB_SCALE = 0.2;
        const viewport = page.getViewport({ scale: THUMB_SCALE });
        const fullViewport = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        setCanvasSize({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled) return;
        ctx.scale(dpr, dpr);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        if (!cancelled) {
          setPageDims({ width: fullViewport.width, height: fullViewport.height });
          setReady(true);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('cancel')) console.warn('[Thumbnail]', msg);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [file, pageIndex]);

  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all w-full"
      style={{ background: isActive ? '#EEF2FF' : 'transparent', outline: isActive ? '2px solid var(--color-primary)' : '2px solid transparent', outlineOffset: 0 }}>
      <div className="overflow-hidden rounded w-full relative" style={{ minHeight: 60, background: '#fff', boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
        <canvas ref={canvasRef} className="w-full h-auto block" style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.2s' }} />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
            <div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        )}
        {ready && canvasSize.width > 0 && pageDims && elements.map((el) => {
          const scaleRatio = canvasSize.width / (pageDims.width * scale);
          return (
            <div key={el.id} className="absolute pointer-events-none" style={{
              left: el.position.x * scale * scaleRatio,
              top: el.position.y * scale * scaleRatio,
              width: el.size.width * scale * scaleRatio,
              height: el.size.height * scale * scaleRatio,
              border: `1.5px solid ${el.type === 'signature' ? 'var(--color-primary)' : 'var(--color-accent)'}`,
              borderRadius: 2,
              backgroundColor: el.type === 'signature' ? 'rgba(67,56,202,0.08)' : 'rgba(6,182,212,0.08)',
            }} />
          );
        })}
      </div>
      <span className="text-xs font-medium" style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
        {pageIndex + 1}
      </span>
    </button>
  );
}