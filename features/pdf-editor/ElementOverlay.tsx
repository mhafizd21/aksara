'use client';

import { useRef, useState, useCallback } from 'react';
import { Trash2, Copy, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PdfElement } from '@/types';
import { useStudioStore } from '@/stores/studio.store';

interface ElementOverlayProps {
  element: PdfElement;
  scale: number;
}

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';

const MIN_SIZE = 40;

export function ElementOverlay({ element, scale }: ElementOverlayProps) {
  const { selectedId, setSelectedId, updateElement, deleteElement, duplicateElement, pushHistory } =
    useStudioStore();
  const isSelected = selectedId === element.id;

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elX: number; elY: number } | null>(null);
  const resizeRef = useRef<{
    handle: ResizeHandle;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Track whether any movement happened — prevents deselect on simple click
  const didMoveRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent canvas click handler from firing
      e.preventDefault();

      // Select the element immediately on mousedown
      setSelectedId(element.id);
      didMoveRef.current = false;

      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elX: element.position.x,
        elY: element.position.y,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragStartRef.current) return;

        // Only start drag+history if moved more than 2px
        if (!didMoveRef.current && Math.abs(ev.clientX - dragStartRef.current.mouseX) < 2 && Math.abs(ev.clientY - dragStartRef.current.mouseY) < 2) return;

        if (!didMoveRef.current) {
          pushHistory();
          didMoveRef.current = true;
          setIsDragging(true);
        }

        const dx = (ev.clientX - dragStartRef.current.mouseX) / scale;
        const dy = (ev.clientY - dragStartRef.current.mouseY) / scale;

        updateElement(element.id, {
          position: {
            x: Math.max(0, dragStartRef.current.elX + dx),
            y: Math.max(0, dragStartRef.current.elY + dy),
          },
        });
      };

      const onUp = () => {
        dragStartRef.current = null;
        setIsDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [element, scale, setSelectedId, updateElement, pushHistory]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();
      pushHistory();
      resizeRef.current = {
        handle,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: element.position.x,
        startY: element.position.y,
        startW: element.size.width,
        startH: element.size.height,
      };

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

        updateElement(element.id, {
          position: { x: newX, y: newY },
          size: { width: newW, height: newH },
        });
      };
      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [element, scale, updateElement, pushHistory]
  );

  const x = element.position.x * scale;
  const y = element.position.y * scale;
  const w = element.size.width * scale;
  const h = element.size.height * scale;

  const renderContent = () => {
    if (element.type === 'signature') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={element.dataUrl}
          alt="Signature"
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      );
    }
    if (element.type === 'text' || element.type === 'date') {
      return (
        <div
          className="w-full h-full flex items-center px-2 overflow-hidden pointer-events-none select-none"
          style={{
            fontSize: element.fontSize * scale,
            fontFamily: element.fontFamily,
            color: element.color,
            whiteSpace: 'nowrap',
          }}
        >
          {element.content}
        </div>
      );
    }
    return null;
  };

  const handles: ResizeHandle[] = ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's'];
  const handlePositions: Record<ResizeHandle, { top?: string; left?: string; bottom?: string; right?: string; cursor: string }> = {
    se: { bottom: '-5px', right: '-5px', cursor: 'se-resize' },
    sw: { bottom: '-5px', left: '-5px', cursor: 'sw-resize' },
    ne: { top: '-5px', right: '-5px', cursor: 'ne-resize' },
    nw: { top: '-5px', left: '-5px', cursor: 'nw-resize' },
    e: { top: '50%', right: '-5px', cursor: 'e-resize' },
    w: { top: '50%', left: '-5px', cursor: 'w-resize' },
    n: { top: '-5px', left: '50%', cursor: 'n-resize' },
    s: { bottom: '-5px', left: '50%', cursor: 's-resize' },
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'absolute group',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={{ left: x, top: y, width: w, height: h }}
    >
      {renderContent()}

      <div
        className={cn(
          'absolute inset-0 rounded transition-all pointer-events-none',
          isSelected
            ? 'ring-2 ring-blue-500 ring-offset-0'
            : 'ring-1 ring-blue-300/0 group-hover:ring-blue-300'
        )}
      />

      {isSelected && (
        <div
          className="absolute -top-9 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1 z-50"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <div className="w-px h-3.5 bg-gray-200" />
          <button
            onClick={(e) => { e.stopPropagation(); duplicateElement(element.id); }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Duplicate (⌘D)"
          >
            <Copy className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
            className="p-1 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      )}

      {isSelected && handles.map((handle) => {
        const pos = handlePositions[handle];
        // eslint-disable-next-line react-hooks/refs
        const onResizeDown = (e: React.MouseEvent) => handleResizeMouseDown(e, handle);
        return (
          <div
            key={handle}
            onMouseDown={onResizeDown}
            className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm z-50"
            style={{
              top: pos.top,
              left: pos.left,
              bottom: pos.bottom,
              right: pos.right,
              cursor: pos.cursor,
              transform: handle === 'e' || handle === 'w' ? 'translateY(-50%)' :
                handle === 'n' || handle === 's' ? 'translateX(-50%)' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}