export const PDF_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export const DEFAULT_SCALE = 1.0;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3.0;
export const SCALE_STEP = 0.25;

export const THUMBNAIL_SCALE = 0.2;

export const DATE_FORMATS = [
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MMMM D, YYYY',
] as const;

export const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Helvetica',
] as const;

export const DEFAULT_TEXT_ELEMENT = {
  width: 200,
  height: 40,
  fontSize: 14,
  fontFamily: 'Arial',
  color: '#000000',
};

export const DEFAULT_DATE_ELEMENT = {
  width: 160,
  height: 40,
  fontSize: 14,
  fontFamily: 'Arial',
  color: '#000000',
  format: 'MM/DD/YYYY',
};

export const DEFAULT_SIGNATURE_ELEMENT = {
  width: 200,
  height: 80,
};

export const SYMBOL_SHAPES = ['check', 'cross', 'circle', 'star', 'rectangle', 'line'] as const;

export const STROKE_STYLES = ['solid', 'dashed', 'dotted'] as const;

interface SymbolShapeDefault {
  strokeColor: string;
  fillColor: string;
  hasFill: boolean;
  hasStroke: boolean;
  strokeWidth: number;
}

export const SYMBOL_SHAPE_DEFAULTS: Record<(typeof SYMBOL_SHAPES)[number], SymbolShapeDefault> = {
  check:     { strokeColor: '#000000', fillColor: '#000000', hasFill: false, hasStroke: true, strokeWidth: 0.18 },
  cross:     { strokeColor: '#000000', fillColor: '#000000', hasFill: false, hasStroke: true, strokeWidth: 0.18 },
  circle:    { strokeColor: '#000000', fillColor: '#000000', hasFill: false, hasStroke: true, strokeWidth: 0.06 },
  star:      { strokeColor: '#000000', fillColor: '#000000', hasFill: true,  hasStroke: false, strokeWidth: 0.04 },
  rectangle: { strokeColor: '#000000', fillColor: '#000000', hasFill: false, hasStroke: true, strokeWidth: 0.04 },
  line:      { strokeColor: '#000000', fillColor: '#000000', hasFill: false, hasStroke: true, strokeWidth: 0.6 },
};

export const SYMBOL_SHAPE_SIZE: Record<(typeof SYMBOL_SHAPES)[number], { width: number; height: number }> = {
  check: { width: 50, height: 50 },
  cross: { width: 50, height: 50 },
  circle: { width: 50, height: 50 },
  star: { width: 50, height: 50 },
  rectangle: { width: 120, height: 70 },
  line: { width: 120, height: 6 },
};

export const SYMBOL_PRESET_COLORS = ['#16A34A', '#DC2626', '#2563EB', '#F59E0B', '#7C3AED', '#000000', 'transparent'];