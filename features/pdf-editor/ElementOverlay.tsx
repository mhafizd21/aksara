'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Trash2, Copy, Scissors, Clipboard, GripHorizontal } from 'lucide-react';
import type { PdfElement } from '@/types';
import { useStudioStore } from '@/stores/studio.store';

interface ElementOverlayProps { element: PdfElement; scale: number; }
type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';
const MIN_SIZE = 40;

function getClient(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if ('changedTouches' in e && (e as TouchEvent).changedTouches.length > 0) {
    return { clientX: (e as TouchEvent).changedTouches[0].clientX, clientY: (e as TouchEvent).changedTouches[0].clientY };
  }
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}

export function ElementOverlay({ element, scale }: ElementOverlayProps) {
  const { selectedId, setSelectedId, updateElement, deleteElement, duplicateElement,
    copyElement, cutElement, pasteElement, clipboard, pushHistory } = useStudioStore();
  const isSelected = selectedId === element.id;

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elX: number; elY: number } | null>(null);
  const resizeRef = useRef<{ handle: ResizeHandle; startMouseX: number; startMouseY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const didMoveRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [ctxMenu]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setSelectedId(element.id);
    didMoveRef.current = false;
    dragStartRef.current = { mouseX: clientX, mouseY: clientY, elX: element.position.x, elY: element.position.y };
  }, [element, setSelectedId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    startDrag(e.clientX, e.clientY);

    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      if (!didMoveRef.current && Math.abs(ev.clientX - dragStartRef.current.mouseX) < 2 && Math.abs(ev.clientY - dragStartRef.current.mouseY) < 2) return;
      if (!didMoveRef.current) { pushHistory(); didMoveRef.current = true; setIsDragging(true); }
      const dx = (ev.clientX - dragStartRef.current.mouseX) / scale;
      const dy = (ev.clientY - dragStartRef.current.mouseY) / scale;
      updateElement(element.id, { position: { x: Math.max(0, dragStartRef.current.elX + dx), y: Math.max(0, dragStartRef.current.elY + dy) } });
    };
    const onUp = () => { dragStartRef.current = null; setIsDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [element, scale, startDrag, updateElement, pushHistory]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);

    // Long press → context menu
    longPressTimer.current = setTimeout(() => {
      setSelectedId(element.id);
      setCtxMenu({ x: t.clientX, y: t.clientY });
    }, 600);

    const onMove = (ev: TouchEvent) => {
      if (!dragStartRef.current) return;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      const { clientX, clientY } = getClient(ev);
      if (!didMoveRef.current && Math.abs(clientX - dragStartRef.current.mouseX) < 4 && Math.abs(clientY - dragStartRef.current.mouseY) < 4) return;
      ev.preventDefault();
      if (!didMoveRef.current) { pushHistory(); didMoveRef.current = true; setIsDragging(true); }
      const dx = (clientX - dragStartRef.current.mouseX) / scale;
      const dy = (clientY - dragStartRef.current.mouseY) / scale;
      updateElement(element.id, { position: { x: Math.max(0, dragStartRef.current.elX + dx), y: Math.max(0, dragStartRef.current.elY + dy) } });
      dragStartRef.current = { ...dragStartRef.current, mouseX: clientX, mouseY: clientY, elX: dragStartRef.current.elX + dx, elY: dragStartRef.current.elY + dy };
    };
    const onEnd = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      dragStartRef.current = null;
      setIsDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [element, scale, startDrag, updateElement, pushHistory, setSelectedId]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation(); e.preventDefault(); pushHistory();
    resizeRef.current = { handle, startMouseX: e.clientX, startMouseY: e.clientY, startX: element.position.x, startY: element.position.y, startW: element.size.width, startH: element.size.height };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      const dx = (ev.clientX - r.startMouseX) / scale;
      const dy = (ev.clientY - r.startMouseY) / scale;
      let newX = r.startX, newY = r.startY, newW = r.startW, newH = r.startH;
      if (handle.includes('e')) newW = Math.max(MIN_SIZE, r.startW + dx);
      if (handle.includes('s')) newH = Math.max(MIN_SIZE, r.startH + dy);
      if (handle.includes('w')) { newW = Math.max(MIN_SIZE, r.startW - dx); newX = r.startX + r.startW - newW; }
      if (handle.includes('n')) { newH = Math.max(MIN_SIZE, r.startH - dy); newY = r.startY + r.startH - newH; }
      updateElement(element.id, { position: { x: newX, y: newY }, size: { width: newW, height: newH } });
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [element, scale, updateElement, pushHistory]);

  const handleResizeDispatch = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const handle = e.currentTarget.dataset.handle as ResizeHandle;
    if (handle) handleResizeMouseDown(e, handle);
  }, [handleResizeMouseDown]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedId(element.id);
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, [element.id, setSelectedId]);

  const x = element.position.x * scale;
  const y = element.position.y * scale;
  const w = element.size.width * scale;
  const h = element.size.height * scale;

  const handles: ResizeHandle[] = ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's'];
  const handlePos: Record<ResizeHandle, React.CSSProperties> = {
    se: { bottom: -5, right: -5, cursor: 'se-resize' },
    sw: { bottom: -5, left: -5, cursor: 'sw-resize' },
    ne: { top: -5, right: -5, cursor: 'ne-resize' },
    nw: { top: -5, left: -5, cursor: 'nw-resize' },
    e:  { top: '50%', right: -5, cursor: 'e-resize', transform: 'translateY(-50%)' },
    w:  { top: '50%', left: -5, cursor: 'w-resize', transform: 'translateY(-50%)' },
    n:  { top: -5, left: '50%', cursor: 'n-resize', transform: 'translateX(-50%)' },
    s:  { bottom: -5, left: '50%', cursor: 's-resize', transform: 'translateX(-50%)' },
  };

  const ctxItems = [
    { label: 'Copy', shortcut: '⌘C', icon: Copy, onClick: () => { copyElement(element.id); setCtxMenu(null); } },
    { label: 'Cut', shortcut: '⌘X', icon: Scissors, onClick: () => { cutElement(element.id); setCtxMenu(null); } },
    { label: 'Paste', shortcut: '⌘V', icon: Clipboard, disabled: !clipboard, onClick: () => { pasteElement(element.position.x + element.size.width + 10, element.position.y); setCtxMenu(null); } },
    { label: 'Duplicate', shortcut: '⌘D', icon: Clipboard, onClick: () => { duplicateElement(element.id); setCtxMenu(null); } },
  ];

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onContextMenu={handleContextMenu}
        className="absolute group"
        style={{ left: x, top: y, width: w, height: h, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        {element.type === 'signature' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={element.dataUrl} alt="Signature"
            className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
        )}
        {(element.type === 'text' || element.type === 'date') && (
          <div className="w-full h-full flex items-center px-2 overflow-hidden pointer-events-none select-none"
            style={{ fontSize: element.fontSize * scale, fontFamily: element.fontFamily, color: element.color, whiteSpace: 'nowrap' }}>
            {element.content}
          </div>
        )}

        <div className="absolute inset-0 rounded pointer-events-none transition-all"
          style={{ outline: isSelected ? '2px solid var(--color-primary)' : '1.5px solid transparent', outlineOffset: 0 }} />
        {!isSelected && (
          <div className="absolute inset-0 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ outline: '1.5px solid var(--color-primary)', outlineOffset: 0 }} />
        )}

        {isSelected && (
          <div
            className="absolute -top-9 left-0 flex items-center gap-1 px-1.5 py-1 z-50"
            style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, boxShadow: 'var(--shadow-md)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <GripHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--color-text-disabled)' }} />
            <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
            <FBtn icon={Copy} title="Copy" onClick={() => copyElement(element.id)} />
            <FBtn icon={Scissors} title="Cut" onClick={() => cutElement(element.id)} />
            <FBtn icon={Clipboard} title="Duplicate" onClick={() => duplicateElement(element.id)} />
            <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
            <FBtn icon={Trash2} title="Delete" onClick={() => deleteElement(element.id)} danger />
          </div>
        )}

        {isSelected && handles.map((handle) => (
          <div key={handle} data-handle={handle} onMouseDown={handleResizeDispatch}
            className="absolute w-3 h-3 z-50"
            style={{ ...handlePos[handle], background: '#fff', border: '2px solid var(--color-primary)', borderRadius: 3 }} />
        ))}
      </div>

      {ctxMenu && (
        <div
          className="fixed z-[200] py-1 min-w-[180px]"
          style={{
            left: Math.min(ctxMenu.x, window.innerWidth - 190),
            top: Math.min(ctxMenu.y, window.innerHeight - 200),
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-dropdown)',
            boxShadow: 'var(--shadow-md)',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {ctxItems.map(({ label, shortcut, icon: Icon, onClick, disabled }) => (
            <button key={label} onClick={onClick} disabled={disabled}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--color-text-primary)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="flex-1 text-left">{label}</span>
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--color-text-disabled)' }}>{shortcut}</span>
            </button>
          ))}
          <div className="my-1" style={{ height: 1, background: 'var(--color-border)' }} />
          <button onClick={() => { deleteElement(element.id); setCtxMenu(null); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
            style={{ color: 'var(--color-danger)', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </>
  );
}

function FBtn({ icon: Icon, title, onClick, danger }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onClick(); }}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{ background: 'transparent', WebkitTapHighlightColor: 'transparent' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? '#FEF2F2' : 'var(--color-surface)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)' }} />
    </button>
  );
}