'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { PdfPageRenderer } from '@/features/pdf-viewer/PdfPageRenderer';
import { ElementOverlay } from '@/features/pdf-editor/ElementOverlay';
import { cn } from '@/lib/utils';

export function PdfCanvas() {
  const {
    document: pdfDoc, currentPage, scale, elements,
    activeToolMode, setSelectedId,
    addTextField, addDateField, setActiveToolMode,
    pendingSignatureDataUrl, pendingSignatureSize,
    placeSignatureAtPosition, cancelSignaturePlacement,
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

  const isPlacingSignature = activeToolMode === 'signature' && !!pendingSignatureDataUrl;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPlacingSignature || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setGhostPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isPlacingSignature]);

  const handleMouseLeave = useCallback(() => {
    setGhostPos(null);
  }, []);

  useEffect(() => {
    if (!isPlacingSignature) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelSignaturePlacement(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlacingSignature, cancelSignaturePlacement]);

  const handleDimensionsChange = useCallback((w: number, h: number) => {
    setCanvasSize((prev) =>
      prev.width === w && prev.height === h ? prev : { width: w, height: h }
    );
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;

      if (isPlacingSignature) {
        placeSignatureAtPosition(currentPage, clickX, clickY);
        setGhostPos(null);
        return;
      }

      if (activeToolMode === 'select') {
        if (e.target === containerRef.current || (e.target as HTMLElement).closest('[data-element-overlay]') === null) {
          setSelectedId(null);
        }
        return;
      }

      if (activeToolMode === 'text') {
        addTextField(currentPage, clickX, clickY);
        setActiveToolMode('select');
      } else if (activeToolMode === 'date') {
        addDateField(currentPage, clickX, clickY);
        setActiveToolMode('select');
      }
    },
    [activeToolMode, isPlacingSignature, currentPage, scale, addTextField, addDateField,
      setSelectedId, setActiveToolMode, placeSignatureAtPosition]
  );

  const pageElements = elements.filter((el) => el.pageIndex === currentPage);

  const cursorClass = isPlacingSignature
    ? 'cursor-none'
    : activeToolMode === 'text' ? 'cursor-text'
    : activeToolMode === 'date' ? 'cursor-crosshair'
    : 'cursor-default';

  const ghostW = pendingSignatureSize ? pendingSignatureSize.width * scale : 0;
  const ghostH = pendingSignatureSize ? pendingSignatureSize.height * scale : 0;

  if (!pdfDoc) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No PDF loaded</p>
          <p className="text-xs text-gray-400 mt-1">Upload a PDF to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-8">
      {isPlacingSignature && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
          <span>Click on the PDF to place your signature</span>
          <span className="opacity-60 text-xs">· ESC to cancel</span>
        </div>
      )}

      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn('relative shadow-2xl bg-white select-none', cursorClass)}
        style={{
          width: canvasSize.width > 0 ? canvasSize.width : 'auto',
          minWidth: 200,
          minHeight: 300,
        }}
      >
        <PdfPageRenderer
          file={pdfDoc.file}
          pageIndex={currentPage}
          scale={scale}
          onDimensionsChange={handleDimensionsChange}
        />

        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {pageElements.map((el) => (
            <div key={el.id} style={{ pointerEvents: 'auto' }} data-element-overlay>
              <ElementOverlay element={el} scale={scale} />
            </div>
          ))}
        </div>

        {/* Ghost signature preview */}
        {isPlacingSignature && pendingSignatureDataUrl && ghostPos && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: ghostPos.x - ghostW / 2,
              top: ghostPos.y - ghostH / 2,
              width: ghostW,
              height: ghostH,
              opacity: 0.65,
              border: '1.5px dashed #3b82f6',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingSignatureDataUrl}
              alt="Signature preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}