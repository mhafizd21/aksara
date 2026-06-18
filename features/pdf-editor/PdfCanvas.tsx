'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { PdfPageRenderer } from '@/features/pdf-viewer/PdfPageRenderer';
import { ElementOverlay } from '@/features/pdf-editor/ElementOverlay';

export function PdfCanvas() {
  const {
    document: pdfDoc, currentPage, scale, elements,
    activeToolMode, setSelectedId,
    addTextField, addDateField, setActiveToolMode,
    pendingSignatureDataUrl, pendingSignatureSize,
    placeSignatureAtPosition, cancelSignaturePlacement,
    pasteElement,
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elX: number; elY: number } | null>(null);

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

  const pageElements = elements.filter((el) => el.pageIndex === currentPage);
  const cursor = isPlacingSignature ? 'none' : activeToolMode === 'text' ? 'text' : activeToolMode === 'date' ? 'crosshair' : 'default';
  const ghostW = pendingSignatureSize ? pendingSignatureSize.width * scale : 0;
  const ghostH = pendingSignatureSize ? pendingSignatureSize.height * scale : 0;

  if (!pdfDoc) return null;

  return (
    <div className="flex-1 overflow-auto flex items-start justify-center p-8" style={{ background: '#F1F5F9' }}>
      {isPlacingSignature && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium pointer-events-none"
          style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-md)' }}>
          <span>Click on the PDF to place your signature</span>
          <span className="opacity-60 text-xs">· ESC to cancel</span>
        </div>
      )}

      <div data-pdf-canvas ref={containerRef}
        onClick={handleCanvasClick} onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        className="relative select-none"
        style={{ cursor, width: canvasSize.width > 0 ? canvasSize.width : 'auto', minWidth: 200, minHeight: 300, background: '#fff', boxShadow: '0 4px 24px 0 rgb(0 0 0 / 0.10), 0 1px 4px 0 rgb(0 0 0 / 0.06)', borderRadius: 2 }}>

        <PdfPageRenderer file={pdfDoc.file} pageIndex={currentPage} scale={scale} onDimensionsChange={handleDimensionsChange} />

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
            opacity: 0.7, border: '1.5px dashed var(--color-primary)', borderRadius: 4, boxSizing: 'border-box',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingSignatureDataUrl} alt="Signature preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} draggable={false} />
          </div>
        )}
      </div>

      {ctxMenu && (
        <div className="fixed z-[200] py-1 min-w-[160px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-dropdown)', boxShadow: 'var(--shadow-md)' }}
          onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { pasteElement(ctxMenu.elX, ctxMenu.elY); setCtxMenu(null); }}
            disabled={!useStudioStore.getState().clipboard}
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors"
            style={{ color: 'var(--color-text-primary)', opacity: !useStudioStore.getState().clipboard ? 0.4 : 1, cursor: !useStudioStore.getState().clipboard ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => { if (useStudioStore.getState().clipboard) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <span>Paste</span>
            <span className="text-xs ml-6" style={{ color: 'var(--color-text-secondary)' }}>⌘V</span>
          </button>
        </div>
      )}
    </div>
  );
}