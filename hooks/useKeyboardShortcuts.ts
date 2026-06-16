'use client';

import { useEffect } from 'react';
import { useStudioStore } from '@/stores/studio.store';

export function useKeyboardShortcuts() {
  const { undo, redo, deleteElement, selectedId, duplicateElement } = useStudioStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Ignore when typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteElement(selectedId); }
      if (mod && e.key === 'd' && selectedId) { e.preventDefault(); duplicateElement(selectedId); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteElement, selectedId, duplicateElement]);
}
