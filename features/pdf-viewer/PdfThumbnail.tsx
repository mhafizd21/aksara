'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/stores/studio.store';

interface PdfThumbnailProps {
  file: File;
  pageIndex: number;
  isActive: boolean;
  onClick: () => void;
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

        // Get full page dims for overlay calculation
        const fullViewport = page.getViewport({ scale: 1 });
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
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all w-full',
        isActive
          ? 'bg-blue-50 ring-2 ring-blue-500'
          : 'hover:bg-gray-50 ring-1 ring-transparent hover:ring-gray-200'
      )}
    >
      <div className="overflow-hidden rounded shadow-sm w-full bg-white relative" style={{ minHeight: 60 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.2s' }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-blue-400 animate-spin" />
          </div>
        )}

        {ready && canvasSize.width > 0 && pageDims && elements.map((el) => {
          const scaleRatio = canvasSize.width / (pageDims.width * scale);
          const left = el.position.x * scale * scaleRatio;
          const top = el.position.y * scale * scaleRatio;
          const width = el.size.width * scale * scaleRatio;
          const height = el.size.height * scale * scaleRatio;

          return (
            <div
              key={el.id}
              className="absolute pointer-events-none"
              style={{
                left, top, width, height,
                border: '1.5px solid',
                borderColor: el.type === 'signature' ? '#3b82f6' : '#10b981',
                borderRadius: 2,
                backgroundColor: el.type === 'signature' ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)',
              }}
            />
          );
        })}
      </div>

      <span className={cn(
        'text-xs font-medium',
        isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
      )}>
        {pageIndex + 1}
      </span>
    </button>
  );
}