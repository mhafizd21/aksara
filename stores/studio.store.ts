import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { PdfElement, PdfDocument, SignatureMode, SymbolShape, StrokeStyle } from '@/types';
import { generateId } from '@/lib/utils';
import {
  DEFAULT_TEXT_ELEMENT, DEFAULT_DATE_ELEMENT, DEFAULT_SCALE,
  SYMBOL_SHAPE_DEFAULTS, SYMBOL_SHAPE_SIZE,
} from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface HistoryEntry { elements: PdfElement[]; }

interface StudioState {
  document: PdfDocument | null;
  currentPage: number;
  scale: number;
  elements: PdfElement[];
  selectedId: string | null;
  selectedIds: string[];
  activeToolMode: 'select' | 'text' | 'date' | 'signature' | 'symbol';
  signatureMode: SignatureMode;
  isSignatureModalOpen: boolean;
  isExporting: boolean;
  downloadFileName: string;
  pendingSignatureDataUrl: string | null;
  pendingSignatureSize: { width: number; height: number } | null;
  selectedSymbolShape: SymbolShape;
  selectedSymbolStrokeColor: string;
  selectedSymbolFillColor: string;
  selectedSymbolHasFill: boolean;
  selectedSymbolHasStroke: boolean;
  selectedSymbolStrokeStyle: StrokeStyle;
  selectedSymbolStrokeWidth: number;
  clipboard: PdfElement | null;
  lockedIds: Record<string, boolean>;
  history: HistoryEntry[];
  historyIndex: number;

  setDocument: (doc: PdfDocument | null) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setActiveToolMode: (mode: StudioState['activeToolMode']) => void;
  setSignatureMode: (mode: SignatureMode) => void;
  setSignatureModalOpen: (open: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setIsExporting: (v: boolean) => void;
  setDownloadFileName: (name: string) => void;
  readySignatureForPlacement: (dataUrl: string, width: number, height: number) => void;
  placeSignatureAtPosition: (pageIndex: number, x: number, y: number) => void;
  cancelSignaturePlacement: () => void;
  addTextField: (pageIndex: number, x?: number, y?: number) => void;
  addDateField: (pageIndex: number, x?: number, y?: number) => void;
  setSelectedSymbolShape: (shape: SymbolShape) => void;
  setSelectedSymbolStrokeColor: (color: string) => void;
  setSelectedSymbolFillColor: (color: string) => void;
  setSelectedSymbolHasFill: (v: boolean) => void;
  setSelectedSymbolHasStroke: (v: boolean) => void;
  setSelectedSymbolStrokeStyle: (style: StrokeStyle) => void;
  setSelectedSymbolStrokeWidth: (v: number) => void;
  addSymbolField: (pageIndex: number, x?: number, y?: number) => void;
  updateElement: (id: string, updates: Partial<PdfElement>) => void;
  updateSelectedElements: (updates: Partial<PdfElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  duplicateElement: (id: string) => void;
  duplicateSelectedElements: () => void;
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
    selectedIds: [],
    activeToolMode: 'select',
    signatureMode: 'draw',
    isSignatureModalOpen: false,
    isExporting: false,
    downloadFileName: '',
    pendingSignatureDataUrl: null,
    pendingSignatureSize: null,
    selectedSymbolShape: 'check',
    selectedSymbolStrokeColor: SYMBOL_SHAPE_DEFAULTS.check.strokeColor,
    selectedSymbolFillColor: SYMBOL_SHAPE_DEFAULTS.check.fillColor,
    selectedSymbolHasFill: SYMBOL_SHAPE_DEFAULTS.check.hasFill,
    selectedSymbolHasStroke: SYMBOL_SHAPE_DEFAULTS.check.hasStroke,
    selectedSymbolStrokeStyle: 'solid',
    selectedSymbolStrokeWidth: SYMBOL_SHAPE_DEFAULTS.check.strokeWidth,
    clipboard: null,
    lockedIds: {},
    history: [{ elements: [] }],
    historyIndex: 0,

    setDocument: (doc) => set((s) => {
      s.document = doc;
      s.currentPage = 0;
      s.elements = [];
      s.lockedIds = {};
      s.selectedId = null;
      s.selectedIds = [];
      s.downloadFileName = doc ? doc.file.name.replace(/\.pdf$/i, '') + '_signed' : '';
    }),
    setCurrentPage: (page) => set((s) => { s.currentPage = page; }),
    setScale: (scale) => set((s) => { s.scale = scale; }),
    setActiveToolMode: (mode) => set((s) => { s.activeToolMode = mode; }),
    setSignatureMode: (mode) => set((s) => { s.signatureMode = mode; }),
    setSignatureModalOpen: (open) => set((s) => { s.isSignatureModalOpen = open; }),
    setSelectedId: (id) => set((s) => {
      s.selectedId = id;
      s.selectedIds = id ? [id] : [];
    }),
    setSelectedIds: (ids) => set((s) => {
      s.selectedIds = ids;
      s.selectedId = ids.length === 1 ? ids[0] : ids.length > 0 ? ids[ids.length - 1] : null;
    }),
    addToSelection: (id) => set((s) => {
      if (!s.selectedIds.includes(id)) {
        s.selectedIds.push(id);
      }
      s.selectedId = id;
    }),
    removeFromSelection: (id) => set((s) => {
      s.selectedIds = s.selectedIds.filter((i) => i !== id);
      s.selectedId = s.selectedIds.length > 0 ? s.selectedIds[s.selectedIds.length - 1] : null;
    }),
    clearSelection: () => set((s) => {
      s.selectedId = null;
      s.selectedIds = [];
    }),
    setIsExporting: (v) => set((s) => { s.isExporting = v; }),
    setDownloadFileName: (name) => set((s) => { s.downloadFileName = name; }),

    toggleLock: (id) => set((s) => {
      if (s.lockedIds[id]) {
        delete s.lockedIds[id];
      } else {
        s.lockedIds[id] = true;
        s.selectedId = null;
        s.selectedIds = s.selectedIds.filter((i) => i !== id);
      }
    }),

    isLocked: (id) => !!get().lockedIds[id],

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
        s.elements.push(el);
        s.selectedId = el.id;
        s.selectedIds = [el.id];
        s.activeToolMode = 'select';
        s.pendingSignatureDataUrl = null;
        s.pendingSignatureSize = null;
      });
    },

    cancelSignaturePlacement: () => {
      set((s) => {
        s.pendingSignatureDataUrl = null;
        s.pendingSignatureSize = null;
        s.activeToolMode = 'select';
      });
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
        fontSize: DEFAULT_TEXT_ELEMENT.fontSize,
        fontFamily: DEFAULT_TEXT_ELEMENT.fontFamily,
        color: DEFAULT_TEXT_ELEMENT.color,
      };
      set((s) => { s.elements.push(el); s.selectedId = el.id; s.selectedIds = [el.id]; s.activeToolMode = 'select'; });
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
        fontSize: DEFAULT_DATE_ELEMENT.fontSize,
        fontFamily: DEFAULT_DATE_ELEMENT.fontFamily,
        color: DEFAULT_DATE_ELEMENT.color,
        format: DEFAULT_DATE_ELEMENT.format,
      };
      set((s) => { s.elements.push(el); s.selectedId = el.id; s.selectedIds = [el.id]; s.activeToolMode = 'select'; });
    },

    setSelectedSymbolShape: (shape) => set((s) => {
      const d = SYMBOL_SHAPE_DEFAULTS[shape];
      s.selectedSymbolShape = shape;
      s.selectedSymbolStrokeColor = d.strokeColor;
      s.selectedSymbolFillColor = d.fillColor;
      s.selectedSymbolHasFill = d.hasFill;
      s.selectedSymbolHasStroke = d.hasStroke;
      s.selectedSymbolStrokeWidth = d.strokeWidth;
    }),

    setSelectedSymbolStrokeColor: (color) => set((s) => { s.selectedSymbolStrokeColor = color; }),
    setSelectedSymbolFillColor: (color) => set((s) => { s.selectedSymbolFillColor = color; }),
    setSelectedSymbolHasFill: (v) => set((s) => { s.selectedSymbolHasFill = v; }),
    setSelectedSymbolHasStroke: (v) => set((s) => { s.selectedSymbolHasStroke = v; }),
    setSelectedSymbolStrokeStyle: (style) => set((s) => { s.selectedSymbolStrokeStyle = style; }),
    setSelectedSymbolStrokeWidth: (v) => set((s) => { s.selectedSymbolStrokeWidth = v; }),

    addSymbolField: (pageIndex, x, y) => {
      get().pushHistory();
      const {
        selectedSymbolShape: shape, selectedSymbolStrokeColor, selectedSymbolFillColor,
        selectedSymbolHasFill, selectedSymbolHasStroke, selectedSymbolStrokeStyle, selectedSymbolStrokeWidth,
      } = get();
      const { width, height } = SYMBOL_SHAPE_SIZE[shape];
      const el: PdfElement = {
        id: generateId(), type: 'symbol', pageIndex, shape,
        strokeColor: selectedSymbolStrokeColor,
        fillColor: selectedSymbolFillColor,
        hasFill: selectedSymbolHasFill,
        hasStroke: selectedSymbolHasStroke,
        strokeStyle: selectedSymbolStrokeStyle,
        strokeWidth: selectedSymbolStrokeWidth,
        position: {
          x: x !== undefined ? Math.max(0, x - width / 2) : 100,
          y: y !== undefined ? Math.max(0, y - height / 2) : 200,
        },
        size: { width, height },
      };
      set((s) => { s.elements.push(el); s.selectedId = el.id; s.selectedIds = [el.id]; s.activeToolMode = 'select'; });
    },

    updateElement: (id, updates) => {
      set((s) => {
        const idx = s.elements.findIndex((e) => e.id === id);
        if (idx !== -1) Object.assign(s.elements[idx], updates);
      });
    },

    updateSelectedElements: (updates) => {
      const { selectedIds } = get();
      set((s) => {
        for (const id of selectedIds) {
          const idx = s.elements.findIndex((e) => e.id === id);
          if (idx !== -1) Object.assign(s.elements[idx], updates);
        }
      });
    },

    deleteElement: (id) => {
      get().pushHistory();
      set((s) => {
        s.elements = s.elements.filter((e) => e.id !== id);
        delete s.lockedIds[id];
        if (s.selectedId === id) s.selectedId = null;
        s.selectedIds = s.selectedIds.filter((i) => i !== id);
      });
    },

    deleteSelectedElements: () => {
      const { selectedIds, lockedIds } = get();
      const toDelete = selectedIds.filter((id) => !lockedIds[id]);
      if (toDelete.length === 0) return;
      get().pushHistory();
      set((s) => {
        s.elements = s.elements.filter((e) => !toDelete.includes(e.id));
        for (const id of toDelete) delete s.lockedIds[id];
        s.selectedId = null;
        s.selectedIds = [];
      });
    },

    duplicateElement: (id) => {
      get().pushHistory();
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      const newEl: PdfElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: generateId(),
        position: { x: el.position.x + 20, y: el.position.y + 20 },
      };
      set((s) => { s.elements.push(newEl); s.selectedId = newEl.id; s.selectedIds = [newEl.id]; });
    },

    duplicateSelectedElements: () => {
      const { selectedIds, lockedIds, elements } = get();
      const toDup = selectedIds.filter((id) => !lockedIds[id]);
      if (toDup.length === 0) return;
      get().pushHistory();
      const newIds: string[] = [];
      const newEls: PdfElement[] = toDup.map((id) => {
        const el = elements.find((e) => e.id === id)!;
        const newId = generateId();
        newIds.push(newId);
        return { ...JSON.parse(JSON.stringify(el)), id: newId, position: { x: el.position.x + 20, y: el.position.y + 20 } };
      });
      set((s) => {
        for (const el of newEls) s.elements.push(el);
        s.selectedIds = newIds;
        s.selectedId = newIds[newIds.length - 1];
      });
    },

    copyElement: (id) => {
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      set((s) => { s.clipboard = JSON.parse(JSON.stringify(el)); });
    },

    cutElement: (id) => {
      if (get().lockedIds[id]) return;
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      get().pushHistory();
      set((s) => {
        s.clipboard = JSON.parse(JSON.stringify(el));
        s.elements = s.elements.filter((e) => e.id !== id);
        delete s.lockedIds[id];
        if (s.selectedId === id) s.selectedId = null;
        s.selectedIds = s.selectedIds.filter((i) => i !== id);
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
      set((s) => { s.elements.push(newEl); s.selectedId = newEl.id; s.selectedIds = [newEl.id]; });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex <= 0) return;
      const prev = history[historyIndex - 1];
      set((s) => {
        s.historyIndex = historyIndex - 1;
        s.elements = JSON.parse(JSON.stringify(prev.elements));
        s.selectedId = null;
        s.selectedIds = [];
      });
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex >= history.length - 1) return;
      const next = history[historyIndex + 1];
      set((s) => {
        s.historyIndex = historyIndex + 1;
        s.elements = JSON.parse(JSON.stringify(next.elements));
        s.selectedId = null;
        s.selectedIds = [];
      });
    },
  }))
);