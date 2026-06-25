'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Clipboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStudioStore } from '@/stores/studio.store';
import { PdfPageRenderer } from '@/features/pdf-viewer/PdfPageRenderer';
import { ElementOverlay } from '@/features/pdf-editor/ElementOverlay';
import { MIN_SCALE, MAX_SCALE } from '@/lib/constants';
import { clampValue } from '@/lib/utils';

export function PdfCanvas() {
  const {
    document: pdfDoc, currentPage, setCurrentPage, scale, setScale, elements,
    activeToolMode, setSelectedId,
    addTextField, addDateField, setActiveToolMode,
    pendingSignatureDataUrl, pendingSignatureSize,
    placeSignatureAtPosition, cancelSignaturePlacement,
    pasteElement, clipboard,
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elX: number; elY: number } | null>(null);

  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const isPinchingRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; startPage: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const isPlacingSignature = activeToolMode === 'signature' && !!pendingSignatureDataUrl;

  useEffect(() => {
    if (!isPlacingSignature) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelSignaturePlacement(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlacingSignature, cancelSignaturePlacement]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [ctxMenu]);

  const handleDimensionsChange = useCallback((w: number, h: number) => {
    setCanvasSize((prev) => prev.width === w && prev.height === h ? prev : { width: w, height: h });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPlacingSignature || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setGhostPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isPlacingSignature]);

  const handleMouseLeave = useCallback(() => { setGhostPos(null); }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setCtxMenu(null);
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
    if (activeToolMode === 'text') { addTextField(currentPage, clickX, clickY); setActiveToolMode('select'); }
    else if (activeToolMode === 'date') { addDateField(currentPage, clickX, clickY); setActiveToolMode('select'); }
  }, [activeToolMode, isPlacingSignature, currentPage, scale, addTextField, addDateField,
    setSelectedId, setActiveToolMode, placeSignatureAtPosition]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-element-overlay]')) return;
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCtxMenu({ x: e.clientX, y: e.clientY, elX: (e.clientX - rect.left) / scale, elY: (e.clientY - rect.top) / scale });
  }, [scale]);

  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      swipeRef.current = null;
      pinchRef.current = { dist: getTouchDist(e.touches[0], e.touches[1]), scale };
      return;
    }

    const onElement = (e.target as HTMLElement).closest('[data-element-overlay]');
    if (onElement || isPlacingSignature) return;

    const t = e.touches[0];
    if (!containerRef.current) return;

    swipeRef.current = { startX: t.clientX, startY: t.clientY, startPage: currentPage };
    isPinchingRef.current = false;
    setSwipeOffset(0);

    const rect = containerRef.current.getBoundingClientRect();
    const pos = {
      x: t.clientX, y: t.clientY,
      elX: (t.clientX - rect.left) / scale,
      elY: (t.clientY - rect.top) / scale,
    };

    longPressTimer.current = setTimeout(() => {
      swipeRef.current = null;
      setCtxMenu(pos);
    }, 600);
  }, [isPlacingSignature, scale, currentPage]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches[0], e.touches[1]);
      const ratio = newDist / pinchRef.current.dist;
      const newScale = clampValue(
        Math.round(pinchRef.current.scale * ratio * 100) / 100,
        MIN_SCALE, MAX_SCALE
      );
      setScale(newScale);
      return;
    }

    const t = e.touches[0];

    if (longPressTimer.current) {
      const moved = swipeRef.current && Math.abs(t.clientX - swipeRef.current.startX) > 8;
      if (moved) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }

    if (swipeRef.current && pdfDoc && !isPinchingRef.current) {
      const dx = t.clientX - swipeRef.current.startX;
      const dy = t.clientY - swipeRef.current.startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
        setSwipeOffset(dx);
      }
    }

    if (isPlacingSignature && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setGhostPos({ x: t.clientX - rect.left, y: t.clientY - rect.top });
    }
  }, [isPlacingSignature, setScale, pdfDoc]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    if (e.touches.length < 2) {
      pinchRef.current = null;
      setTimeout(() => { isPinchingRef.current = false; }, 100);
    }

    if (swipeRef.current && pdfDoc && !isPinchingRef.current) {
      const dx = swipeOffset;
      const threshold = 60;
      if (dx < -threshold && currentPage < pdfDoc.numPages - 1) {
        setCurrentPage(currentPage + 1);
      } else if (dx > threshold && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
      setSwipeOffset(0);
      swipeRef.current = null;
    }

    if (isPlacingSignature && containerRef.current && !isPinchingRef.current) {
      const t = e.changedTouches[0];
      const rect = containerRef.current.getBoundingClientRect();
      placeSignatureAtPosition(currentPage, (t.clientX - rect.left) / scale, (t.clientY - rect.top) / scale);
      setGhostPos(null);
    }
  }, [isPlacingSignature, currentPage, scale, pdfDoc, swipeOffset, setCurrentPage, placeSignatureAtPosition]);

  const pageElements = elements.filter((el) => el.pageIndex === currentPage);

  const cursor = isPlacingSignature ? 'none'
    : activeToolMode === 'text' ? 'text'
    : activeToolMode === 'date' ? 'crosshair'
    : 'default';

  const ghostW = pendingSignatureSize ? pendingSignatureSize.width * scale : 0;
  const ghostH = pendingSignatureSize ? pendingSignatureSize.height * scale : 0;
  const hasClipboard = !!clipboard;

  if (!pdfDoc) return null;

  return (
    <div className="flex-1 overflow-auto flex flex-col items-center" style={{ background: '#F1F5F9' }}>

      {/* Mobile page nav bar */}
      <div
        className="flex sm:hidden items-center justify-between w-full px-4 py-2 shrink-0"
        style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="p-2 rounded-lg disabled:opacity-30 transition-colors active:bg-gray-100"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Page {currentPage + 1} of {pdfDoc.numPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(pdfDoc.numPages - 1, currentPage + 1))}
          disabled={currentPage === pdfDoc.numPages - 1}
          className="p-2 rounded-lg disabled:opacity-30 transition-colors active:bg-gray-100"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Canvas wrapper */}
      <div className="flex-1 overflow-auto flex items-start justify-center w-full p-3 sm:p-8">
        {isPlacingSignature && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium pointer-events-none"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-md)' }}>
            <span className="hidden sm:inline">Click on the PDF to place your signature</span>
            <span className="sm:hidden">Tap to place signature</span>
            <span className="opacity-60 text-xs hidden sm:inline">· ESC to cancel</span>
          </div>
        )}

        <div
          data-pdf-canvas
          ref={containerRef}
          onClick={handleCanvasClick}
          onContextMenu={handleContextMenu}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative select-none"
          style={{
            cursor,
            width: canvasSize.width > 0 ? canvasSize.width : 'auto',
            maxWidth: '100%',
            minWidth: 200, minHeight: 300,
            background: '#fff',
            boxShadow: '0 4px 24px 0 rgb(0 0 0 / 0.10), 0 1px 4px 0 rgb(0 0 0 / 0.06)',
            borderRadius: 2,
            touchAction: isPlacingSignature ? 'none' : 'pan-y',
            transform: swipeOffset ? `translateX(${Math.max(-40, Math.min(40, swipeOffset * 0.3))}px)` : undefined,
            transition: swipeOffset === 0 ? 'transform 0.2s ease' : undefined,
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

          {isPlacingSignature && pendingSignatureDataUrl && ghostPos && (
            <div className="absolute pointer-events-none" style={{
              left: ghostPos.x - ghostW / 2, top: ghostPos.y - ghostH / 2,
              width: ghostW, height: ghostH,
              opacity: 0.7, border: '1.5px dashed var(--color-primary)',
              borderRadius: 4, boxSizing: 'border-box',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingSignatureDataUrl} alt="Signature preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                draggable={false} />
            </div>
          )}
        </div>

        {ctxMenu && (
          <div
            className="fixed z-[200] py-1 min-w-[160px]"
            style={{
              left: Math.min(ctxMenu.x, window.innerWidth - 170),
              top: Math.min(ctxMenu.y, window.innerHeight - 80),
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-dropdown)',
              boxShadow: 'var(--shadow-md)',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { pasteElement(ctxMenu.elX, ctxMenu.elY); setCtxMenu(null); }}
              disabled={!hasClipboard}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
              style={{ color: 'var(--color-text-primary)', opacity: !hasClipboard ? 0.4 : 1, cursor: !hasClipboard ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (hasClipboard) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Clipboard className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="flex-1 text-left">Paste</span>
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--color-text-disabled)' }}>⌘V</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}