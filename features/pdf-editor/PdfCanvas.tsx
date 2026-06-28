'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Clipboard } from 'lucide-react';
import { useStudioStore } from '@/stores/studio.store';
import { PdfPageRenderer } from '@/features/pdf-viewer/PdfPageRenderer';
import { ElementOverlay, SymbolGraphic } from '@/features/pdf-editor/ElementOverlay';
import { MIN_SCALE, MAX_SCALE, SYMBOL_SHAPE_SIZE } from '@/lib/constants';
import { clampValue } from '@/lib/utils';

export function PdfCanvas() {
  const {
    document: pdfDoc, currentPage, setCurrentPage, scale, setScale, elements,
    activeToolMode, setSelectedId, setSelectedIds, addToSelection, clearSelection,
    addTextField, addDateField, addSymbolField, setActiveToolMode,
    pendingSignatureDataUrl, pendingSignatureSize,
    placeSignatureAtPosition, cancelSignaturePlacement,
    selectedSymbolShape, selectedSymbolStrokeColor, selectedSymbolFillColor,
    selectedSymbolHasFill, selectedSymbolHasStroke, selectedSymbolStrokeStyle, selectedSymbolStrokeWidth,
    pasteElement, clipboard,
    selectedIds,
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elX: number; elY: number } | null>(null);

  // Drag-select state
  const dragSelectRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const isPinchingRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; startPage: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Track touch start to detect tap on canvas background (for unselect)
  const touchStartRef = useRef<{ x: number; y: number; time: number; onElement: boolean } | null>(null);

  const isPlacingSignature = activeToolMode === 'signature' && !!pendingSignatureDataUrl;
  const isPlacingSymbol = activeToolMode === 'symbol';
  const isPlacingGhost = isPlacingSignature || isPlacingSymbol;

  useEffect(() => {
    if (!isPlacingSignature && !isPlacingSymbol) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isPlacingSignature) cancelSignaturePlacement();
      else setActiveToolMode('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlacingSignature, isPlacingSymbol, cancelSignaturePlacement, setActiveToolMode]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [ctxMenu]);

  // Helper: get canvas-relative coords from a mouse/touch client position
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { canvasX: 0, canvasY: 0, pdfX: 0, pdfY: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const s = useStudioStore.getState().scale;
    return { canvasX, canvasY, pdfX: canvasX / s, pdfY: canvasY / s };
  }, []);

  // Returns true when the PDF canvas is wider than its scroll container
  const isHorizontallyOverflowing = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return false;
    return el.scrollWidth > el.clientWidth + 1;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    if (isPlacingGhost) {
      const { canvasX, canvasY } = getCanvasCoords(e.clientX, e.clientY);
      setGhostPos({ x: canvasX, y: canvasY });
      return;
    }

    if (dragSelectRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const { startX, startY } = dragSelectRef.current;
      if (Math.abs(curX - startX) > 3 || Math.abs(curY - startY) > 3) {
        dragSelectRef.current.moved = true;
      }
      setDragRect({
        x: Math.min(startX, curX),
        y: Math.min(startY, curY),
        w: Math.abs(curX - startX),
        h: Math.abs(curY - startY),
      });
    }
  }, [isPlacingGhost, getCanvasCoords]);

  const handleMouseLeave = useCallback(() => {
    setGhostPos(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPlacingGhost) return;
    if (e.button !== 0) return;
    // Only start drag-select when clicking directly on the canvas background
    const target = e.target as HTMLElement;
    if (target.closest('[data-element-overlay]')) return;
    if (!containerRef.current) return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    dragSelectRef.current = { startX, startY, moved: false };
    setDragRect(null);

    // Clear selection immediately on background mousedown (unless shift)
    if (!e.shiftKey) clearSelection();

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragSelectRef.current || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const curX = ev.clientX - r.left;
      const curY = ev.clientY - r.top;
      const { startX: sx, startY: sy } = dragSelectRef.current;
      if (Math.abs(curX - sx) > 3 || Math.abs(curY - sy) > 3) {
        dragSelectRef.current.moved = true;
      }
      setDragRect({
        x: Math.min(sx, curX),
        y: Math.min(sy, curY),
        w: Math.abs(curX - sx),
        h: Math.abs(curY - sy),
      });
    };

    const onMouseUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!dragSelectRef.current || !containerRef.current) {
        dragSelectRef.current = null;
        setDragRect(null);
        return;
      }

      const { moved } = dragSelectRef.current;
      const r = containerRef.current.getBoundingClientRect();
      const curX = ev.clientX - r.left;
      const curY = ev.clientY - r.top;
      const sx = dragSelectRef.current.startX;
      const sy = dragSelectRef.current.startY;

      dragSelectRef.current = null;
      setDragRect(null);

      if (!moved) return; // simple click, already handled clearSelection

      const s = useStudioStore.getState().scale;
      const selRect = {
        x: Math.min(sx, curX) / s,
        y: Math.min(sy, curY) / s,
        w: Math.abs(curX - sx) / s,
        h: Math.abs(curY - sy) / s,
      };

      const state = useStudioStore.getState();
      const pageEls = state.elements.filter((el) => el.pageIndex === state.currentPage);
      const hit = pageEls.filter((el) =>
        el.position.x < selRect.x + selRect.w &&
        el.position.x + el.size.width > selRect.x &&
        el.position.y < selRect.y + selRect.h &&
        el.position.y + el.size.height > selRect.y
      );

      if (hit.length > 0) {
        setSelectedIds(hit.map((el) => el.id));
      } else {
        clearSelection();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [activeToolMode, isPlacingGhost, clearSelection, setSelectedIds]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setCtxMenu(null);

    const target = e.target as HTMLElement;
    if (target.closest('[data-element-overlay]')) return;

    if (isPlacingGhost) {
      const { pdfX, pdfY } = getCanvasCoords(e.clientX, e.clientY);
      if (isPlacingSignature) {
        placeSignatureAtPosition(currentPage, pdfX, pdfY);
        setGhostPos(null);
      } else if (isPlacingSymbol) {
        addSymbolField(currentPage, pdfX, pdfY);
      }
      return;
    }

    if (activeToolMode === 'text') {
      const { pdfX, pdfY } = getCanvasCoords(e.clientX, e.clientY);
      addTextField(currentPage, pdfX, pdfY);
      return;
    }
    if (activeToolMode === 'date') {
      const { pdfX, pdfY } = getCanvasCoords(e.clientX, e.clientY);
      addDateField(currentPage, pdfX, pdfY);
      return;
    }
  }, [
    isPlacingGhost, isPlacingSignature, isPlacingSymbol, activeToolMode, currentPage,
    getCanvasCoords, placeSignatureAtPosition, addSymbolField, addTextField, addDateField,
  ]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const { pdfX, pdfY } = getCanvasCoords(e.clientX, e.clientY);
    setCtxMenu({ x: e.clientX, y: e.clientY, elX: pdfX, elY: pdfY });
  }, [getCanvasCoords]);

  const getTouchDist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      swipeRef.current = null;
      pinchRef.current = { dist: getTouchDist(e.touches[0], e.touches[1]), scale };
      return;
    }

    const t = e.touches[0];
    const onElement = !!(e.target as HTMLElement).closest('[data-element-overlay]');

    // Track touch start info for tap-to-unselect detection
    touchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      time: Date.now(),
      onElement,
    };

    if (onElement || isPlacingGhost) return;

    if (!containerRef.current) return;

    swipeRef.current = isHorizontallyOverflowing()
      ? null
      : { startX: t.clientX, startY: t.clientY, startPage: currentPage };
    isPinchingRef.current = false;
    setSwipeOffset(0);

    const { pdfX, pdfY } = getCanvasCoords(t.clientX, t.clientY);
    const pos = { x: t.clientX, y: t.clientY, elX: pdfX, elY: pdfY };

    longPressTimer.current = setTimeout(() => {
      swipeRef.current = null;
      setCtxMenu(pos);
    }, 600);
  }, [isPlacingGhost, scale, currentPage, getCanvasCoords, isHorizontallyOverflowing]);

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

    if (swipeRef.current && pdfDoc && !isPinchingRef.current && !isHorizontallyOverflowing()) {
      const dx = t.clientX - swipeRef.current.startX;
      const dy = t.clientY - swipeRef.current.startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
        setSwipeOffset(dx);
      }
    }

    if (isPlacingGhost && containerRef.current) {
      const { canvasX, canvasY } = getCanvasCoords(t.clientX, t.clientY);
      setGhostPos({ x: canvasX, y: canvasY });
    }
  }, [isPlacingGhost, setScale, pdfDoc, getCanvasCoords, isHorizontallyOverflowing]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    if (e.touches.length < 2) {
      pinchRef.current = null;
      setTimeout(() => { isPinchingRef.current = false; }, 100);
    }

    // Detect tap on canvas background → unselect
    if (touchStartRef.current && !touchStartRef.current.onElement && !isPinchingRef.current) {
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      const dt = Date.now() - touchStartRef.current.time;
      const isTap = dx < 10 && dy < 10 && dt < 500;

      if (isTap && !isPlacingGhost) {
        clearSelection();
      }
    }
    touchStartRef.current = null;

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
      const { pdfX, pdfY } = getCanvasCoords(t.clientX, t.clientY);
      placeSignatureAtPosition(currentPage, pdfX, pdfY);
      setGhostPos(null);
    }
  }, [isPlacingSignature, isPlacingGhost, currentPage, pdfDoc, swipeOffset, clearSelection, setCurrentPage, placeSignatureAtPosition, getCanvasCoords]);

  const pageElements = elements.filter((el) => el.pageIndex === currentPage);

  const cursor = isPlacingGhost ? 'none'
    : activeToolMode === 'text' ? 'text'
    : activeToolMode === 'date' ? 'crosshair'
    : 'default';

  const ghostW = pendingSignatureSize ? pendingSignatureSize.width * scale : 0;
  const ghostH = pendingSignatureSize ? pendingSignatureSize.height * scale : 0;
  const symbolGhostSize = SYMBOL_SHAPE_SIZE[selectedSymbolShape];
  const symbolGhostW = symbolGhostSize.width * scale;
  const symbolGhostH = symbolGhostSize.height * scale;
  const hasClipboard = !!clipboard;

  if (!pdfDoc) return null;

  return (
    <div className="flex-1 overflow-auto flex flex-col items-center" style={{ background: '#F1F5F9' }}>

      {/* Multi-select info bar */}
      {selectedIds.length > 1 && (
        <div
          className="w-full px-4 py-1.5 text-xs font-medium flex items-center gap-2"
          style={{ background: '#EEF2FF', borderBottom: '1px solid #C7D2FE', color: 'var(--color-primary)' }}
        >
          <span>{selectedIds.length} elements selected</span>
          <span className="opacity-50">·</span>
          <span className="opacity-70">Shift+click to add/remove · ESC to deselect</span>
        </div>
      )}

      {/* Canvas wrapper */}
      <div ref={wrapperRef} className="flex-1 overflow-auto flex items-start w-full p-3 sm:p-8">
        {isPlacingGhost && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium pointer-events-none"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-md)' }}>
            <span className="hidden sm:inline">
              {isPlacingSignature ? 'Click on the PDF to place your signature' : 'Click on the PDF to place the symbol'}
            </span>
            <span className="sm:hidden">
              {isPlacingSignature ? 'Tap to place signature' : 'Tap to place symbol'}
            </span>
            <span className="opacity-60 text-xs hidden sm:inline">· ESC to cancel</span>
          </div>
        )}

        {/* PDF canvas container — sized naturally by the canvas inside */}
        <div
          data-pdf-canvas
          ref={containerRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative select-none inline-block mx-auto"
          style={{
            cursor,
            background: '#fff',
            boxShadow: '0 4px 24px 0 rgb(0 0 0 / 0.10), 0 1px 4px 0 rgb(0 0 0 / 0.06)',
            borderRadius: 2,
            touchAction: isPlacingGhost ? 'none' : 'pan-x pan-y',
            transform: swipeOffset ? `translateX(${Math.max(-40, Math.min(40, swipeOffset * 0.3))}px)` : undefined,
            transition: swipeOffset === 0 ? 'transform 0.2s ease' : undefined,
          }}
        >
          {/* PdfPageRenderer renders a <canvas> — the container sizes to it naturally */}
          <PdfPageRenderer
            file={pdfDoc.file}
            pageIndex={currentPage}
            scale={scale}
          />

          {/* Element overlay — absolute over the PDF canvas, same origin */}
          <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
            {pageElements.map((el) => (
              <div key={el.id} style={{ pointerEvents: 'auto' }} data-element-overlay>
                <ElementOverlay element={el} scale={scale} />
              </div>
            ))}
          </div>

          {/* Drag-select rectangle */}
          {dragRect && dragRect.w > 3 && dragRect.h > 3 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: dragRect.x,
                top: dragRect.y,
                width: dragRect.w,
                height: dragRect.h,
                border: '1.5px dashed var(--color-primary)',
                background: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 2,
                zIndex: 100,
              }}
            />
          )}

          {/* Signature ghost */}
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

          {/* Symbol ghost */}
          {isPlacingSymbol && ghostPos && (
            <div className="absolute pointer-events-none" style={{
              left: ghostPos.x - symbolGhostW / 2, top: ghostPos.y - symbolGhostH / 2,
              width: symbolGhostW, height: symbolGhostH,
              opacity: 0.6,
            }}>
              <SymbolGraphic
                shape={selectedSymbolShape}
                strokeColor={selectedSymbolStrokeColor}
                fillColor={selectedSymbolFillColor}
                hasFill={selectedSymbolHasFill}
                hasStroke={selectedSymbolHasStroke}
                strokeStyle={selectedSymbolStrokeStyle}
                strokeWidth={selectedSymbolStrokeWidth}
                width={symbolGhostW}
                height={symbolGhostH}
              />
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