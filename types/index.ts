export type ElementType = 'signature' | 'text' | 'date' | 'symbol';

export type SymbolShape = 'check' | 'cross' | 'circle' | 'star' | 'rectangle' | 'line';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  pageIndex: number;
  position: Position;
  size: Size;
  rotation?: number;
}

export interface SignatureElement extends BaseElement {
  type: 'signature';
  dataUrl: string;
}

export interface TextField extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface DateField extends BaseElement {
  type: 'date';
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  format: string;
}

export interface SymbolElement extends BaseElement {
  type: 'symbol';
  shape: SymbolShape;
  /** Outline color. Used by every shape (the 'star' outline is optional, see hasStroke). */
  strokeColor: string;
  /** Fill color. Only rendered when hasFill is true. */
  fillColor: string;
  /** Whether the fill color is applied. Always false for 'check' / 'cross' / 'line'. */
  hasFill: boolean;
  /** Whether the stroke/outline is drawn. Always true except optionally for filled shapes. */
  hasStroke: boolean;
  /** Dash pattern of the outline. Applies to 'rectangle', 'circle' and 'line'. */
  strokeStyle: StrokeStyle;
  /** Stroke thickness as a ratio of min(width, height). */
  strokeWidth: number;
}

export type PdfElement = SignatureElement | TextField | DateField | SymbolElement;

export interface PdfPage {
  index: number;
  width: number;
  height: number;
}

export interface PdfDocument {
  file: File;
  numPages: number;
  pages: PdfPage[];
}

export type SignatureMode = 'draw' | 'type' | 'upload';

export interface HistoryEntry {
  elements: PdfElement[];
}