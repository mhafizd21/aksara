# PDF Studio

A production-ready PDF signing and annotation web application built with Next.js 15, React 19, and TypeScript.

---

## Features

- **Upload PDF** — drag & drop or click to upload any PDF
- **Render PDF** — hardware-accelerated canvas rendering via PDF.js
- **Page navigation** — thumbnail sidebar + toolbar pagination
- **Zoom** — 50–300% with preset shortcuts
- **Signatures** — draw, type (3 fonts), or upload an image
- **Text fields** — add, edit, style, drag, resize
- **Date fields** — auto-formatted dates with 4 format options
- **Drag & resize** — pixel-accurate element manipulation
- **Properties panel** — live font, size, color, and position editing
- **Undo / Redo** — full 50-step history (⌘Z / ⌘Y)
- **Keyboard shortcuts** — Delete, ⌘D duplicate, ⌘Z/⌘Y
- **Export PDF** — flat-baked PDF with all annotations via pdf-lib
- **Responsive** — works from 768 px wide upward

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 15 App Router |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand + Immer |
| PDF render | pdfjs-dist 4.x |
| PDF export | pdf-lib |
| Signature | react-signature-canvas |
| Icons | lucide-react |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
git clone <repo>
cd pdf-studio
npm install
```

### Dev server

```bash
npm run dev
# → http://localhost:3000  (redirects to /studio)
```

### Production build

```bash
npm run build
npm start
```

### Lint + type-check

```bash
npx eslint . --ext .ts,.tsx
npx tsc --noEmit
```

---

## Environment Variables

No environment variables are required for the base application. Optional additions for future features:

```env
# Analytics (future)
NEXT_PUBLIC_POSTHOG_KEY=

# Storage backend (future)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Project Structure

```
pdf-studio/
├── app/
│   ├── globals.css          # Tailwind + font imports
│   ├── layout.tsx           # Root HTML layout
│   ├── page.tsx             # Redirect → /studio
│   └── studio/
│       └── page.tsx         # Main studio shell
│
├── features/
│   ├── pdf-viewer/
│   │   ├── PdfPageRenderer.tsx   # Canvas-based page render
│   │   ├── PdfThumbnail.tsx      # Sidebar thumbnail
│   │   └── ThumbnailSidebar.tsx  # Left panel
│   │
│   ├── pdf-editor/
│   │   ├── ElementOverlay.tsx    # Drag + resize + toolbar
│   │   ├── PdfCanvas.tsx         # Center canvas + hit testing
│   │   ├── PropertiesPanel.tsx   # Right panel
│   │   ├── Toolbar.tsx           # Top toolbar
│   │   ├── UploadDropZone.tsx    # Empty state upload
│   │   └── ZoomControls.tsx      # Bottom zoom bar
│   │
│   ├── signature/
│   │   └── SignatureModal.tsx    # Draw / type / upload
│   │
│   └── export/
│       # (export logic lives in hooks/usePdfExport.ts)
│
├── hooks/
│   ├── useKeyboardShortcuts.ts  # Global keyboard handler
│   ├── usePdfExport.ts          # pdf-lib export logic
│   └── usePdfLoader.ts          # pdfjs-dist loader
│
├── lib/
│   ├── constants.ts    # Scales, formats, defaults
│   └── utils.ts        # cn(), generateId(), formatDate()
│
├── stores/
│   └── studio.store.ts  # Zustand store (all app state)
│
└── types/
    └── index.ts         # PdfElement, SignatureElement, etc.
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘Y` / `Ctrl+Y` | Redo |
| `⌘⇧Z` | Redo (Mac alternate) |
| `⌘D` / `Ctrl+D` | Duplicate selected |
| `Delete` / `Backspace` | Delete selected |

---

## Architecture Notes

### State Management

All mutable app state lives in a single `useStudioStore` (Zustand + Immer). Components subscribe to only the slices they need. History is stored as a plain `PdfElement[]` array snapshot array — no deep observer overhead.

### PDF Rendering

PDF.js worker is loaded from cdnjs CDN via dynamic import to keep the initial bundle tiny. Each `PdfPageRenderer` manages its own render lifecycle with cancel-on-unmount to prevent stale renders on fast navigation.

### Element System

Every annotation (`signature | text | date`) is a typed `PdfElement` with a `position` and `size` in **unscaled PDF coordinates**. The `ElementOverlay` multiplies by `scale` for screen positioning, so coordinates stay stable across zoom levels.

### Export

`usePdfExport` re-opens the original `File` bytes via `pdf-lib`, maps each element's unscaled position back to the page's native coordinate space (accounting for current scale), and embeds images/text directly onto the PDF pages before saving.

---

## Future Extension Points

| Area | Suggestion |
|------|-----------|
| **Multi-page elements** | Allow an element to span pages (e.g., header) |
| **Templates** | Save a set of element positions as a reusable template |
| **Cloud storage** | Integrate Supabase Storage or S3 for PDF persistence |
| **Auth + audit trail** | Add signing requests, email delivery, and audit log |
| **Form fields** | Checkbox, radio, dropdown field types |
| **Annotations** | Freehand drawing / highlight / redaction tools |
| **Collaboration** | Real-time multi-user cursors via Liveblocks / PartyKit |
| **Mobile gestures** | Pinch-to-zoom + touch drag for iOS/Android |
| **OCR** | Auto-detect existing form fields with Tesseract.js |
| **Prefill API** | REST endpoint to prefill fields before sending |
