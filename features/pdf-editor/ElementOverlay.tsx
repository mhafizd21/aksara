'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Trash2, Copy, Scissors, Clipboard, GripHorizontal, Lock, Unlock, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PdfElement, SymbolElement } from '@/types';
import { useStudioStore } from '@/stores/studio.store';

interface ElementOverlayProps { element: PdfElement; scale: number; }
type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';
const MIN_SIZE = 1;

function getStrokeDash(style: 'solid' | 'dashed' | 'dotted', strokeWidthPx: number): string | undefined {
  if (style === 'dashed') return `${strokeWidthPx * 2.4} ${strokeWidthPx * 1.6}`;
  if (style === 'dotted') return `${strokeWidthPx * 0.01} ${strokeWidthPx * 1.6}`;
  return undefined;
}

const STAR_POINTS_FRAC: [number, number][] = [
  [0.50, 0.05], [0.61, 0.38], [0.97, 0.38], [0.67, 0.59], [0.78, 0.92],
  [0.50, 0.71], [0.22, 0.92], [0.33, 0.59], [0.03, 0.38], [0.39, 0.38],
];

function starPath(w: number, h: number): string {
  return STAR_POINTS_FRAC.map(([fx, fy], i) => `${i === 0 ? 'M' : 'L'}${fx * w} ${fy * h}`).join(' ') + ' Z';
}

function getClient(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e && e.touches.length > 0)
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  if ('changedTouches' in e && (e as TouchEvent).changedTouches.length > 0)
    return { clientX: (e as TouchEvent).changedTouches[0].clientX, clientY: (e as TouchEvent).changedTouches[0].clientY };
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}

export function SymbolGraphic({ shape, strokeColor, fillColor, hasFill, hasStroke, strokeStyle, strokeWidth, width: w, height: h }: {
  shape: SymbolElement['shape'];
  strokeColor: string;
  fillColor: string;
  hasFill: boolean;
  hasStroke: boolean;
  strokeStyle: SymbolElement['strokeStyle'];
  strokeWidth: number;
  width: number;
  height: number;
}) {
  const strokeWPx = Math.max(0.5, strokeWidth * Math.min(w, h));
  const dash = getStrokeDash(strokeStyle, strokeWPx);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full pointer-events-none select-none" style={{ display: 'block', overflow: 'visible' }}>
      {shape === 'check' && (
        <path d={`M${0.20 * w} ${0.52 * h} L${0.40 * w} ${0.72 * h} L${0.82 * w} ${0.28 * h}`}
          fill="none" stroke={strokeColor} strokeWidth={strokeWPx}
          strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {shape === 'cross' && (
        <path d={`M${0.22 * w} ${0.22 * h} L${0.78 * w} ${0.78 * h} M${0.78 * w} ${0.22 * h} L${0.22 * w} ${0.78 * h}`}
          fill="none" stroke={strokeColor} strokeWidth={strokeWPx}
          strokeDasharray={dash} strokeLinecap="round" />
      )}
      {shape === 'circle' && (
        <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - strokeWPx / 2)} ry={Math.max(0, h / 2 - strokeWPx / 2)}
          fill={hasFill ? fillColor : 'none'}
          stroke={hasStroke ? strokeColor : 'none'}
          strokeWidth={strokeWPx} strokeDasharray={dash} />
      )}
      {shape === 'rectangle' && (
        <rect x={strokeWPx / 2} y={strokeWPx / 2}
          width={Math.max(0, w - strokeWPx)} height={Math.max(0, h - strokeWPx)}
          rx={Math.min(8, Math.min(w, h) * 0.08)}
          fill={hasFill ? fillColor : 'none'}
          stroke={hasStroke ? strokeColor : 'none'}
          strokeWidth={strokeWPx} strokeDasharray={dash} />
      )}
      {shape === 'line' && (
        <line x1={strokeWPx / 2} y1={h / 2} x2={Math.max(strokeWPx / 2, w - strokeWPx / 2)} y2={h / 2}
          stroke={strokeColor} strokeWidth={strokeWPx}
          strokeDasharray={dash} strokeLinecap="round" />
      )}
      {shape === 'star' && (
        <path d={starPath(w, h)}
          fill={hasFill ? fillColor : 'none'}
          stroke={hasStroke ? strokeColor : 'none'}
          strokeWidth={hasStroke ? strokeWPx : 0} strokeDasharray={hasStroke ? dash : undefined}
          strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function ElementOverlay({ element, scale }: ElementOverlayProps) {
  const {
    selectedId, selectedIds, setSelectedId, addToSelection, removeFromSelection,
    updateElement, deleteElement, duplicateElement,
    copyElement, cutElement, pasteElement, clipboard, pushHistory, toggleLock,
    deleteSelectedElements, duplicateSelectedElements,
  } = useStudioStore();

  const locked = useStudioStore((s) => !!s.lockedIds[element.id]);
  const isSelected = selectedIds.includes(element.id);
  const isPrimary = selectedId === element.id;
  const isMultiSelect = selectedIds.length > 1;

  // Direct ref to the element DOM node — used for rotate center calculation
  // instead of querySelector so it works immediately on mount before animation completes.
  const elementRef = useRef<HTMLDivElement>(null);

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elX: number; elY: number } | null>(null);
  const resizeRef = useRef<{ handle: ResizeHandle; startMouseX: number; startMouseY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const didMoveRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const rotation = element.rotation ?? 0;

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [ctxMenu]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.select(); }, 0);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation(); e.preventDefault();

    const wasAlreadySelected = selectedIds.includes(element.id);

    if (e.shiftKey) {
      if (wasAlreadySelected) removeFromSelection(element.id);
      else addToSelection(element.id);
      return;
    }

    if (wasAlreadySelected && isMultiSelect) {
      useStudioStore.setState({ selectedId: element.id });
    } else if (!wasAlreadySelected) {
      setSelectedId(element.id);
    }

    if (locked) return;
    didMoveRef.current = false;
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, elX: element.position.x, elY: element.position.y };

    const state = useStudioStore.getState();
    const multiDragStarts = state.selectedIds
      .filter((id) => !state.lockedIds[id])
      .map((id) => {
        const el = state.elements.find((el) => el.id === id);
        return el ? { id, startX: el.position.x, startY: el.position.y } : null;
      })
      .filter(Boolean) as { id: string; startX: number; startY: number }[];

    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (ev.clientX - dragStartRef.current.mouseX) / scale;
      const dy = (ev.clientY - dragStartRef.current.mouseY) / scale;
      if (!didMoveRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        didMoveRef.current = true;
        setIsDragging(true);
      }
      if (didMoveRef.current) {
        if (isMultiSelect && multiDragStarts.length > 0) {
          multiDragStarts.forEach(({ id, startX, startY }) => {
            updateElement(id, { position: { x: startX + dx, y: startY + dy } });
          });
        } else {
          updateElement(element.id, { position: { x: dragStartRef.current.elX + dx, y: dragStartRef.current.elY + dy } });
        }
      }
    };

    const onUp = () => {
      if (didMoveRef.current) pushHistory();
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [element, scale, locked, isEditing, isMultiSelect, selectedIds, addToSelection, removeFromSelection, setSelectedId, updateElement, pushHistory]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isEditing) return;
    e.stopPropagation();

    // Notify canvas that this touch hit an element so it won't clear selection
    e.currentTarget.dispatchEvent(new CustomEvent('element-touch-start', { bubbles: true }));

    const wasAlreadySelected = selectedIds.includes(element.id);
    if (!wasAlreadySelected) setSelectedId(element.id);
    if (locked) return;

    const t = e.touches[0];
    didMoveRef.current = false;
    dragStartRef.current = { mouseX: t.clientX, mouseY: t.clientY, elX: element.position.x, elY: element.position.y };

    const state = useStudioStore.getState();
    const multiDragStarts = state.selectedIds
      .filter((id) => !state.lockedIds[id])
      .map((id) => {
        const el = state.elements.find((el) => el.id === id);
        return el ? { id, startX: el.position.x, startY: el.position.y } : null;
      })
      .filter(Boolean) as { id: string; startX: number; startY: number }[];

    longPressTimer.current = setTimeout(() => {
      setCtxMenu({ x: t.clientX, y: t.clientY });
    }, 600);

    const onMove = (ev: TouchEvent) => {
      const { clientX, clientY } = getClient(ev);
      if (!dragStartRef.current) return;
      const dx = (clientX - dragStartRef.current.mouseX) / scale;
      const dy = (clientY - dragStartRef.current.mouseY) / scale;
      if (!didMoveRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        didMoveRef.current = true;
        setIsDragging(true);
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      }
      if (didMoveRef.current) {
        ev.preventDefault();
        if (isMultiSelect && multiDragStarts.length > 0) {
          multiDragStarts.forEach(({ id, startX, startY }) => {
            updateElement(id, { position: { x: startX + dx, y: startY + dy } });
          });
        } else {
          updateElement(element.id, { position: { x: dragStartRef.current.elX + dx, y: dragStartRef.current.elY + dy } });
        }
      }
    };

    const onUp = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      if (didMoveRef.current) pushHistory();
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [element, scale, locked, isEditing, isMultiSelect, selectedIds, setSelectedId, updateElement, pushHistory]);

  const startResize = useCallback((handle: ResizeHandle, startX: number, startY: number) => {
    resizeRef.current = {
      handle, startMouseX: startX, startMouseY: startY,
      startX: element.position.x, startY: element.position.y,
      startW: element.size.width, startH: element.size.height,
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!resizeRef.current) return;
      const { clientX, clientY } = getClient(ev);
      const { handle, startMouseX, startMouseY, startX, startY, startW, startH } = resizeRef.current;
      const rawDx = (clientX - startMouseX) / scale;
      const rawDy = (clientY - startMouseY) / scale;

      let nx = startX, ny = startY, nw = startW, nh = startH;
      if (handle.includes('e')) { nw = Math.max(MIN_SIZE, startW + rawDx); }
      if (handle.includes('w')) { const dw = Math.min(rawDx, startW - MIN_SIZE); nx = startX + dw; nw = startW - dw; }
      if (handle.includes('s')) { nh = Math.max(MIN_SIZE, startH + rawDy); }
      if (handle.includes('n')) { const dh = Math.min(rawDy, startH - MIN_SIZE); ny = startY + dh; nh = startH - dh; }

      updateElement(element.id, { position: { x: nx, y: ny }, size: { width: nw, height: nh } });
    };

    const onUp = () => {
      pushHistory();
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [element, scale, updateElement, pushHistory]);

  const handleResizeDispatch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const handle = (e.currentTarget as HTMLElement).dataset.handle as ResizeHandle;
    startResize(handle, e.clientX, e.clientY);
  }, [startResize]);

  const handleResizeTouchDispatch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation(); e.preventDefault();
    const handle = (e.currentTarget as HTMLElement).dataset.handle as ResizeHandle;
    startResize(handle, e.touches[0].clientX, e.touches[0].clientY);
  }, [startResize]);

  const startRotate = useCallback((startX: number, startY: number) => {
    // Use elementRef directly instead of querySelector so this works
    // immediately on mount, before the entrance animation has completed.
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(startY - cy, startX - cx) * (180 / Math.PI);
    const startRotation = element.rotation ?? 0;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = getClient(ev);
      const angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
      let newRot = startRotation + (angle - startAngle);
      if ((ev as MouseEvent | TouchEvent & { shiftKey?: boolean }).shiftKey ?? false) {
        newRot = Math.round(newRot / 15) * 15;
      }
      updateElement(element.id, { rotation: ((newRot % 360) + 360) % 360 });
    };

    const onUp = () => {
      pushHistory();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [element, updateElement, pushHistory]);

  const handleRotateMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    startRotate(e.clientX, e.clientY);
  }, [startRotate]);

  const handleRotateTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation(); e.preventDefault();
    startRotate(e.touches[0].clientX, e.touches[0].clientY);
  }, [startRotate]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (locked || (element.type !== 'text' && element.type !== 'date')) return;
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.select(); }, 0);
  }, [locked, element.type]);

  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !locked && (element.type === 'text' || element.type === 'date')) {
      e.stopPropagation(); startEditing();
    }
    lastTapRef.current = now;
  }, [locked, element.type, startEditing]);

  const commitEdit = useCallback(() => { setIsEditing(false); }, []);

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
    se: { bottom: -6, right: -6, cursor: 'se-resize' },
    sw: { bottom: -6, left: -6, cursor: 'sw-resize' },
    ne: { top: -6, right: -6, cursor: 'ne-resize' },
    nw: { top: -6, left: -6, cursor: 'nw-resize' },
    e:  { top: '50%', right: -6, cursor: 'e-resize', transform: 'translateY(-50%)' },
    w:  { top: '50%', left: -6, cursor: 'w-resize', transform: 'translateY(-50%)' },
    n:  { top: -6, left: '50%', cursor: 'n-resize', transform: 'translateX(-50%)' },
    s:  { bottom: -6, left: '50%', cursor: 's-resize', transform: 'translateX(-50%)' },
  };

  const ctxItems = [
    { label: locked ? 'Unlock' : 'Lock', icon: locked ? Unlock : Lock, onClick: () => { toggleLock(element.id); setCtxMenu(null); } },
    { label: 'Copy', shortcut: '⌘C', icon: Copy, onClick: () => { copyElement(element.id); setCtxMenu(null); }, disabled: false },
    { label: 'Cut', shortcut: '⌘X', icon: Scissors, onClick: () => { cutElement(element.id); setCtxMenu(null); }, disabled: locked },
    { label: 'Paste', shortcut: '⌘V', icon: Clipboard, disabled: !clipboard, onClick: () => { pasteElement(element.position.x + element.size.width + 10, element.position.y); setCtxMenu(null); } },
    { label: 'Duplicate', shortcut: '⌘D', icon: Clipboard, onClick: () => { duplicateElement(element.id); setCtxMenu(null); }, disabled: locked },
    { label: 'Reset rotation', icon: RotateCw, onClick: () => { updateElement(element.id, { rotation: 0 }); setCtxMenu(null); }, disabled: locked || rotation === 0 },
  ];

  const outlineColor = locked ? '#F59E0B' : isMultiSelect && isSelected ? '#6366F1' : 'var(--color-primary)';
  const outlineStyle = isMultiSelect && isSelected && !isPrimary ? '2px dashed' : '2px solid';

  return (
    <>
      {/* Element wrapper — animate on mount (scale in from center) */}
      <motion.div
        ref={elementRef}
        data-element-id={element.id}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={(e) => { handleDoubleTap(e); handleTouchStart(e); }}
        onContextMenu={handleContextMenu}
        className="absolute group"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.6 }}
        style={{
          left: x, top: y, width: w, height: h,
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: 'center center',
          cursor: isEditing ? 'text' : locked ? 'default' : isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        {element.type === 'signature' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={element.dataUrl} alt="Signature"
            className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
        )}

        {element.type === 'symbol' && (
          <SymbolGraphic shape={element.shape} strokeColor={element.strokeColor} fillColor={element.fillColor}
            hasFill={element.hasFill} hasStroke={element.hasStroke} strokeStyle={element.strokeStyle}
            strokeWidth={element.strokeWidth} width={w} height={h} />
        )}

        {(element.type === 'text' || element.type === 'date') && (
          isEditing ? (
            <textarea
              ref={editInputRef}
              value={element.content}
              onChange={(e) => updateElement(element.id, { content: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Escape') commitEdit(); e.stopPropagation(); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-full bg-transparent resize-none focus:outline-none"
              style={{ fontSize: element.fontSize * scale, fontFamily: element.fontFamily, color: element.color, lineHeight: 1.2, padding: '4px 8px', overflow: 'hidden', cursor: 'text' }}
              rows={1}
            />
          ) : (
            <div
              className="w-full h-full flex items-center px-2 overflow-hidden pointer-events-none select-none"
              style={{ fontSize: element.fontSize * scale, fontFamily: element.fontFamily, color: element.color, whiteSpace: 'nowrap' }}
            >
              {element.content}
            </div>
          )
        )}

        {/* Selection ring — animated opacity */}
        <motion.div
          className="absolute inset-0 rounded pointer-events-none"
          animate={{
            opacity: isSelected ? 1 : 0,
            outline: isSelected ? `${outlineStyle} ${outlineColor}` : '1.5px solid transparent',
          }}
          transition={{ duration: 0.12 }}
          style={{ outlineOffset: 0 }}
        />
        {/* Hover ring */}
        {!isSelected && (
          <div className="absolute inset-0 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ outline: `1.5px solid ${locked ? '#F59E0B' : 'var(--color-primary)'}`, outlineOffset: 0 }} />
        )}

        {locked && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-50 pointer-events-none"
            style={{ background: '#F59E0B' }}
          >
            <Lock className="w-2.5 h-2.5 text-white" />
          </motion.div>
        )}

        {/* Floating toolbar — slide down from above */}
        <AnimatePresence>
          {isPrimary && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.5 }}
              className="absolute -top-10 left-0 flex items-center gap-1 px-1.5 py-1 z-50"
              style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <GripHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--color-text-disabled)' }} />
              <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
              {isMultiSelect ? (
                <>
                  <span className="text-xs px-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedIds.length} selected
                  </span>
                  <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
                  <FBtn icon={Clipboard} title="Duplicate all (⌘D)" onClick={() => duplicateSelectedElements()} />
                  <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
                  <FBtn icon={Trash2} title="Delete all" onClick={() => deleteSelectedElements()} danger />
                </>
              ) : (
                <>
                  <FBtn icon={locked ? Unlock : Lock} title={locked ? 'Unlock' : 'Lock'}
                    onClick={() => toggleLock(element.id)}
                    iconStyle={{ color: locked ? '#F59E0B' : 'var(--color-text-secondary)' }} />
                  <FBtn icon={Copy} title="Copy (⌘C)" onClick={() => copyElement(element.id)} />
                  {!locked && (
                    <>
                      <FBtn icon={Scissors} title="Cut (⌘X)" onClick={() => cutElement(element.id)} />
                      <FBtn icon={Clipboard} title="Duplicate (⌘D)" onClick={() => duplicateElement(element.id)} />
                      <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
                      <FBtn
                        icon={RotateCw}
                        title={`Rotate · drag handle at bottom-right · Shift=15° snap · current: ${Math.round(rotation)}°`}
                        onClick={() => updateElement(element.id, { rotation: ((rotation + 15) % 360) })}
                        iconStyle={{ color: rotation !== 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                      />
                    </>
                  )}
                  <div className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
                  <FBtn icon={Trash2} title="Delete" onClick={() => deleteElement(element.id)} danger />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resize handles — pop in */}
        <AnimatePresence>
          {isPrimary && !locked && !isMultiSelect && handles.map((handle) => (
            <motion.div
              key={handle}
              data-handle={handle}
              onMouseDown={handleResizeDispatch}
              onTouchStart={handleResizeTouchDispatch}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24, mass: 0.4 }}
              className="absolute z-50"
              style={{ ...handlePos[handle], width: 12, height: 12, background: '#fff', border: '2px solid var(--color-primary)', borderRadius: 3, touchAction: 'none' }}
            />
          ))}
        </AnimatePresence>

        {/* Rotate handle */}
        <AnimatePresence>
          {isPrimary && !locked && !isMultiSelect && (
            <motion.div
              onMouseDown={handleRotateMouseDown}
              onTouchStart={handleRotateTouchStart}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24, mass: 0.4 }}
              className="absolute z-50 flex items-center justify-center"
              title="Drag to rotate · Shift = snap 15°"
              style={{
                bottom: -24, right: -24,
                width: 20, height: 20,
                background: '#fff',
                border: '2px solid var(--color-primary)',
                borderRadius: '50%',
                cursor: 'crosshair',
                touchAction: 'none',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <RotateCw className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rotation badge */}
        <AnimatePresence>
          {isPrimary && !isMultiSelect && rotation !== 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none z-50"
              style={{
                bottom: -22, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--color-primary)', color: '#fff',
                fontSize: 9, fontWeight: 600,
                padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap',
              }}
            >
              {Math.round(rotation)}°
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Context menu — fade + scale in */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed z-[200] py-1 min-w-[180px]"
            style={{
              left: Math.min(ctxMenu.x, window.innerWidth - 190),
              top: Math.min(ctxMenu.y, window.innerHeight - 280),
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-dropdown)',
              boxShadow: 'var(--shadow-md)',
              transformOrigin: 'top left',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {ctxItems.map(({ label, shortcut, icon: Icon, onClick, disabled }) => (
              <button key={label} onClick={onClick} disabled={disabled}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-primary)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                <span className="flex-1 text-left">{label}</span>
                {shortcut && <span className="text-xs hidden sm:inline" style={{ color: 'var(--color-text-disabled)' }}>{shortcut}</span>}
              </button>
            ))}
            <div className="my-1" style={{ height: 1, background: 'var(--color-border)' }} />
            <button onClick={() => { deleteElement(element.id); setCtxMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
              style={{ color: 'var(--color-danger)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FBtn({ icon: Icon, title, onClick, danger, iconStyle }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string; onClick: () => void; danger?: boolean; iconStyle?: React.CSSProperties;
}) {
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onClick(); }}
      title={title}
      whileTap={{ scale: 0.82 }}
      className="p-1.5 rounded transition-colors"
      style={{ background: 'transparent', WebkitTapHighlightColor: 'transparent' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? '#FEF2F2' : 'var(--color-surface)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5"
        style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)', ...iconStyle }} />
    </motion.button>
  );
}