'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Clipboard } from 'lucide-react';
import { useStudioStore } from '@/stores/studio.store';
import { PdfPageRenderer } from '@/features/pdf-viewer/PdfPageRenderer';
import { ElementOverlay } from '@/features/pdf-editor/ElementOverlay';
import { MIN_SCALE, MAX_SCALE } from '@/lib/constants';
import { clampValue } from '@/lib/utils';

export function PdfCanvas() {
  const {
    document: pdfDoc, currentPage, scale, setScale, elements,
    activeToolMode, setSelectedId,
    addTextField, addDateField, setActiveToolMode,
    pendingSignatureDataUrl, pendingSignatureSize,
    placeSignatureAtPosition, cancelSignaturePlacement,
    pasteElement, clipboard,
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elX: number; elY: number } | null>(null);

  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const isPinchingRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPosRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);

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
      pinchRef.current = { dist: getTouchDist(e.touches[0], e.touches[1]), scale };
      return;
    }

    if ((e.target as HTMLElement).closest('[data-element-overlay]')) return;
    if (isPlacingSignature) return;

    const t = e.touches[0];
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = {
      x: t.clientX, y: t.clientY,
      elX: (t.clientX - rect.left) / scale,
      elY: (t.clientY - rect.top) / scale,
    };
    touchPosRef.current = pos;
    isPinchingRef.current = false;

    longPressTimer.current = setTimeout(() => {
      setCtxMenu(pos);
    }, 600);
  }, [isPlacingSignature, scale]);

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

    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    if (isPlacingSignature && containerRef.current) {
      const t = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      setGhostPos({ x: t.clientX - rect.left, y: t.clientY - rect.top });
    }
  }, [isPlacingSignature, setScale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    if (e.touches.length < 2) {
      pinchRef.current = null;
      setTimeout(() => { isPinchingRef.current = false; }, 100);
      return;
    }

    if (isPinchingRef.current) return;

    if (isPlacingSignature && containerRef.current) {
      const t = e.changedTouches[0];
      const rect = containerRef.current.getBoundingClientRect();
      placeSignatureAtPosition(currentPage, (t.clientX - rect.left) / scale, (t.clientY - rect.top) / scale);
      setGhostPos(null);
    }
  }, [isPlacingSignature, currentPage, scale, placeSignatureAtPosition]);

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
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto flex items-start justify-center p-4 sm:p-8"
      style={{ background: '#F1F5F9' }}
    >
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
          minWidth: 200, minHeight: 300,
          background: '#fff',
          boxShadow: '0 4px 24px 0 rgb(0 0 0 / 0.10), 0 1px 4px 0 rgb(0 0 0 / 0.06)',
          borderRadius: 2,
          touchAction: isPlacingSignature ? 'none' : 'pan-x pan-y',
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
  );
}