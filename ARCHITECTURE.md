# PDF Studio — Architecture Documentation

## Design Principles

1. **Feature-based** — code is grouped by product capability, not technical layer
2. **Single responsibility** — each hook owns one concern; each component owns one UI slice
3. **Coordinate independence** — all element positions stored in unscaled PDF space
4. **Lazy everything** — PDF.js worker, signature canvas, and pdf-lib all loaded on demand
5. **Strict TypeScript** — discriminated unions for element types, no `any` in business logic

---

## Data Flow

```
User Action
    │
    ▼
Component (feature/)
    │  calls action
    ▼
useStudioStore (Zustand + Immer)
    │  updates state slice
    ▼
Subscribed Components re-render
    │
    ▼  (on export)
usePdfExport → pdf-lib → Blob → download
```

---

## Type System

```
PdfElement (discriminated union)
  ├── SignatureElement   { type: 'signature', dataUrl: string }
  ├── TextField          { type: 'text', content, fontSize, fontFamily, color }
  └── DateField          { type: 'date', content, format, fontSize, fontFamily, color }

All share: { id, pageIndex, position: {x,y}, size: {width,height} }
```

---

## Coordinate System

Elements store **unscaled coordinates** (PDF points at scale=1.0).

```
Stored:   position.x = 100, size.width = 200   (scale-independent)
Rendered: left = 100 * scale,  width = 200 * scale
Export:   x_pdf = 100 * (pageNativeWidth / renderedWidth)
```

This means you can zoom to any level and export will always produce correctly-placed annotations.

---

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `Toolbar` | File upload, tool mode switching, page nav, undo/redo, export trigger |
| `ThumbnailSidebar` | Render thumbnail strip, emit page change events |
| `PdfCanvas` | Render active page, route click → add element, host overlays |
| `PdfPageRenderer` | Single canvas render lifecycle (mount → render → cancel on unmount) |
| `PdfThumbnail` | Single thumbnail canvas render at 0.2× scale |
| `ElementOverlay` | Mouse drag, resize handle logic, element toolbar (delete/duplicate) |
| `PropertiesPanel` | Live property editing for selected element |
| `ZoomControls` | Scale state read/write, preset dropdown |
| `SignatureModal` | Draw/type/upload tabs, produce dataUrl, dispatch to store |
| `UploadDropZone` | Empty-state UI, drag-and-drop, file picker |

---

## History System

History is a simple `PdfElement[][]` array. On every destructive action:

1. `pushHistory()` snapshots current `elements` via `JSON.parse(JSON.stringify(...))`
2. The new state is applied
3. `undo()` moves `historyIndex` back and restores that snapshot
4. `redo()` moves it forward

Max 50 entries. Fine-grained drag/resize do **not** push history on every mouse move — only on `mousedown` (before the change starts), keeping the history useful without flooding it.

---

## Performance Considerations

### Large PDF handling

- `PdfPageRenderer` renders only the **current page** — not all pages simultaneously
- Thumbnails are lazy: each `PdfThumbnail` renders independently when it first enters the DOM
- PDF.js worker is loaded via dynamic `import()` — not in the main bundle
- `pdf-lib` is also dynamically imported only when export is triggered

### Re-render hygiene

- All store action callbacks are stable (Zustand selectors are referentially stable for primitives)
- `useCallback` is used on all mouse event handlers in `ElementOverlay`
- Canvas renders are guarded by a `cancelled` flag to prevent setState-after-unmount

---

## Extension Guide

### Adding a new element type

1. Add the type to `types/index.ts` as a new interface extending `BaseElement`
2. Add it to the `PdfElement` union
3. Add a `addXField` action in `studio.store.ts`
4. Render it in `ElementOverlay.tsx` → `renderContent()`
5. Add a properties section in `PropertiesPanel.tsx`
6. Handle export in `usePdfExport.ts`

### Adding a new toolbar tool

1. Add the tool mode to `StudioState['activeToolMode']` union in the store
2. Add a button in `Toolbar.tsx`
3. Handle the click in `PdfCanvas.tsx` → `handleCanvasClick`
