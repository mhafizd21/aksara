'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studio.store';

export function useKeyboardShortcuts() {
  const {
    undo, redo, deleteElement, selectedId,
    duplicateElement, copyElement, cutElement, pasteElement,
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteElement(selectedId); return; }
      if (mod && e.key === 'd' && selectedId) { e.preventDefault(); duplicateElement(selectedId); return; }
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteElement, selectedId, duplicateElement, copyElement, cutElement, pasteElement]);
}