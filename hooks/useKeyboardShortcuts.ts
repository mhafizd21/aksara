'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studio.store';

export function useKeyboardShortcuts() {
  const {
    undo, redo, deleteElement, deleteSelectedElements, selectedId, selectedIds,
    duplicateElement, duplicateSelectedElements, copyElement, cutElement, pasteElement,
    clearSelection,
  } = useStudioStore();

  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

      // Escape to clear selection
      if (e.key === 'Escape') { e.preventDefault(); clearSelection(); return; }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 1) { e.preventDefault(); deleteSelectedElements(); return; }
        if (selectedId) { e.preventDefault(); deleteElement(selectedId); return; }
      }

      // Duplicate
      if (mod && e.key === 'd') {
        if (selectedIds.length > 1) { e.preventDefault(); duplicateSelectedElements(); return; }
        if (selectedId) { e.preventDefault(); duplicateElement(selectedId); return; }
      }

      if (mod && e.key === 'c' && selectedId) { e.preventDefault(); copyElement(selectedId); return; }
      if (mod && e.key === 'x' && selectedId) { e.preventDefault(); cutElement(selectedId); return; }

      if (mod && e.key === 'v') {
        e.preventDefault();
        const canvasEl = window.document.querySelector('[data-pdf-canvas]') as HTMLElement | null;
        if (canvasEl && mousePosRef.current) {
          const rect = canvasEl.getBoundingClientRect();
          const { scale } = useStudioStore.getState();
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;
          if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
            const x = (mx - rect.left) / scale;
            const y = (my - rect.top) / scale;
            pasteElement(x, y);
            return;
          }
        }
        pasteElement();
        return;
      }

      // Arrow keys: move selected element(s)
      // Shift+Arrow = large step (10px), Arrow = small step (1px)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const { selectedIds: ids, lockedIds, elements, updateElement, pushHistory } = useStudioStore.getState();
        if (ids.length === 0) return;
        e.preventDefault();

        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        pushHistory();
        for (const id of ids) {
          if (lockedIds[id]) continue;
          const el = elements.find((el) => el.id === id);
          if (!el) continue;
          updateElement(id, {
            position: {
              x: Math.max(0, el.position.x + dx),
              y: Math.max(0, el.position.y + dy),
            },
          });
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteElement, deleteSelectedElements, selectedId, selectedIds,
    duplicateElement, duplicateSelectedElements, copyElement, cutElement, pasteElement, clearSelection]);
}