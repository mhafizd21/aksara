import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { PdfElement, PdfDocument, SignatureMode } from '@/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_TEXT_ELEMENT, DEFAULT_DATE_ELEMENT, DEFAULT_SCALE } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface HistoryEntry { elements: PdfElement[]; }

interface StudioState {
  document: PdfDocument | null;
  currentPage: number;
  scale: number;
  elements: PdfElement[];
  selectedId: string | null;
  activeToolMode: 'select' | 'text' | 'date' | 'signature';
  signatureMode: SignatureMode;
  isSignatureModalOpen: boolean;
  isExporting: boolean;
  downloadFileName: string;
  pendingSignatureDataUrl: string | null;
  pendingSignatureSize: { width: number; height: number } | null;
  clipboard: PdfElement | null;
  lockedIds: Set<string>;
  history: HistoryEntry[];
  historyIndex: number;

  setDocument: (doc: PdfDocument | null) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setActiveToolMode: (mode: StudioState['activeToolMode']) => void;
  setSignatureMode: (mode: SignatureMode) => void;
  setSignatureModalOpen: (open: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setIsExporting: (v: boolean) => void;
  setDownloadFileName: (name: string) => void;
  readySignatureForPlacement: (dataUrl: string, width: number, height: number) => void;
  placeSignatureAtPosition: (pageIndex: number, x: number, y: number) => void;
  cancelSignaturePlacement: () => void;
  addTextField: (pageIndex: number, x?: number, y?: number) => void;
  addDateField: (pageIndex: number, x?: number, y?: number) => void;
  updateElement: (id: string, updates: Partial<PdfElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  copyElement: (id: string) => void;
  cutElement: (id: string) => void;
  pasteElement: (x?: number, y?: number) => void;
  toggleLock: (id: string) => void;
  isLocked: (id: string) => boolean;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const MAX_HISTORY = 50;

export const useStudioStore = create<StudioState>()(
  immer((set, get) => ({
    document: null,
    currentPage: 0,
    scale: DEFAULT_SCALE,
    elements: [],
    selectedId: null,
    activeToolMode: 'select',
    signatureMode: 'draw',
    isSignatureModalOpen: false,
    isExporting: false,
    downloadFileName: '',
    pendingSignatureDataUrl: null,
    pendingSignatureSize: null,
    clipboard: null,
    lockedIds: new Set<string>(),
    history: [{ elements: [] }],
    historyIndex: 0,

    setDocument: (doc) => set((s) => {
      s.document = doc;
      s.currentPage = 0;
      s.elements = [];
      s.lockedIds = new Set<string>();
      s.downloadFileName = doc ? doc.file.name.replace(/\.pdf$/i, '') + '_signed' : '';
    }),
    setCurrentPage: (page) => set((s) => { s.currentPage = page; }),
    setScale: (scale) => set((s) => { s.scale = scale; }),
    setActiveToolMode: (mode) => set((s) => { s.activeToolMode = mode; }),
    setSignatureMode: (mode) => set((s) => { s.signatureMode = mode; }),
    setSignatureModalOpen: (open) => set((s) => { s.isSignatureModalOpen = open; }),
    setSelectedId: (id) => set((s) => { s.selectedId = id; }),
    setIsExporting: (v) => set((s) => { s.isExporting = v; }),
    setDownloadFileName: (name) => set((s) => { s.downloadFileName = name; }),

    toggleLock: (id) => set((s) => {
      if (s.lockedIds.has(id)) { s.lockedIds.delete(id); }
      else { s.lockedIds.add(id); s.selectedId = null; }
    }),

    isLocked: (id) => get().lockedIds.has(id),

    pushHistory: () => {
      const { elements, history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ elements: JSON.parse(JSON.stringify(elements)) });
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      set((s) => { s.history = newHistory; s.historyIndex = newHistory.length - 1; });
    },

    readySignatureForPlacement: (dataUrl, width, height) => {
      set((s) => {
        s.pendingSignatureDataUrl = dataUrl;
        s.pendingSignatureSize = { width, height };
        s.activeToolMode = 'signature';
        s.isSignatureModalOpen = false;
      });
    },

    placeSignatureAtPosition: (pageIndex, x, y) => {
      const { pendingSignatureDataUrl, pendingSignatureSize } = get();
      if (!pendingSignatureDataUrl || !pendingSignatureSize) return;
      get().pushHistory();
      const { width, height } = pendingSignatureSize;
      const el: PdfElement = {
        id: generateId(), type: 'signature', pageIndex,
        dataUrl: pendingSignatureDataUrl,
        position: { x: Math.max(0, x - width / 2), y: Math.max(0, y - height / 2) },
        size: { width, height },
      };
      set((s) => {
        s.elements.push(el); s.selectedId = el.id;
        s.activeToolMode = 'select';
        s.pendingSignatureDataUrl = null; s.pendingSignatureSize = null;
      });
    },

    cancelSignaturePlacement: () => {
      set((s) => { s.pendingSignatureDataUrl = null; s.pendingSignatureSize = null; s.activeToolMode = 'select'; });
    },

    addTextField: (pageIndex, x, y) => {
      get().pushHistory();
      const el: PdfElement = {
        id: generateId(), type: 'text', pageIndex, content: 'Text here',
        position: {
          x: x !== undefined ? Math.max(0, x - DEFAULT_TEXT_ELEMENT.width / 2) : 100,
          y: y !== undefined ? Math.max(0, y - DEFAULT_TEXT_ELEMENT.height / 2) : 100,
        },
        size: { width: DEFAULT_TEXT_ELEMENT.width, height: DEFAULT_TEXT_ELEMENT.height },
        fontSize: DEFAULT_TEXT_ELEMENT.fontSize, fontFamily: DEFAULT_TEXT_ELEMENT.fontFamily, color: DEFAULT_TEXT_ELEMENT.color,
      };
      set((s) => { s.elements.push(el); s.selectedId = el.id; s.activeToolMode = 'select'; });
    },

    addDateField: (pageIndex, x, y) => {
      get().pushHistory();
      const el: PdfElement = {
        id: generateId(), type: 'date', pageIndex,
        content: formatDate(new Date(), DEFAULT_DATE_ELEMENT.format),
        position: {
          x: x !== undefined ? Math.max(0, x - DEFAULT_DATE_ELEMENT.width / 2) : 100,
          y: y !== undefined ? Math.max(0, y - DEFAULT_DATE_ELEMENT.height / 2) : 150,
        },
        size: { width: DEFAULT_DATE_ELEMENT.width, height: DEFAULT_DATE_ELEMENT.height },
        fontSize: DEFAULT_DATE_ELEMENT.fontSize, fontFamily: DEFAULT_DATE_ELEMENT.fontFamily,
        color: DEFAULT_DATE_ELEMENT.color, format: DEFAULT_DATE_ELEMENT.format,
      };
      set((s) => { s.elements.push(el); s.selectedId = el.id; s.activeToolMode = 'select'; });
    },

    updateElement: (id, updates) => {
      set((s) => {
        const idx = s.elements.findIndex((e) => e.id === id);
        if (idx !== -1) Object.assign(s.elements[idx], updates);
      });
    },

    deleteElement: (id) => {
      get().pushHistory();
      set((s) => {
        s.elements = s.elements.filter((e) => e.id !== id);
        s.lockedIds.delete(id);
        if (s.selectedId === id) s.selectedId = null;
      });
    },

    duplicateElement: (id) => {
      get().pushHistory();
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      const newEl: PdfElement = { ...JSON.parse(JSON.stringify(el)), id: generateId(), position: { x: el.position.x + 20, y: el.position.y + 20 } };
      set((s) => { s.elements.push(newEl); s.selectedId = newEl.id; });
    },

    copyElement: (id) => {
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      set((s) => { s.clipboard = JSON.parse(JSON.stringify(el)); });
    },

    cutElement: (id) => {
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      get().pushHistory();
      set((s) => {
        s.clipboard = JSON.parse(JSON.stringify(el));
        s.elements = s.elements.filter((e) => e.id !== id);
        s.lockedIds.delete(id);
        if (s.selectedId === id) s.selectedId = null;
      });
    },

    pasteElement: (x, y) => {
      const { clipboard, currentPage } = get();
      if (!clipboard) return;
      get().pushHistory();
      const newEl: PdfElement = {
        ...JSON.parse(JSON.stringify(clipboard)),
        id: generateId(),
        pageIndex: currentPage,
        position: x !== undefined && y !== undefined
          ? { x: Math.max(0, x - clipboard.size.width / 2), y: Math.max(0, y - clipboard.size.height / 2) }
          : { x: clipboard.position.x + 20, y: clipboard.position.y + 20 },
      };
      set((s) => { s.elements.push(newEl); s.selectedId = newEl.id; });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex <= 0) return;
      const prev = history[historyIndex - 1];
      set((s) => { s.historyIndex = historyIndex - 1; s.elements = JSON.parse(JSON.stringify(prev.elements)); s.selectedId = null; });
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex >= history.length - 1) return;
      const next = history[historyIndex + 1];
      set((s) => { s.historyIndex = historyIndex + 1; s.elements = JSON.parse(JSON.stringify(next.elements)); s.selectedId = null; });
    },
  }))
);