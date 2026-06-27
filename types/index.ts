export type ElementType = 'signature' | 'text' | 'date' | 'symbol';

export type SymbolShape = 'check' | 'cross' | 'circle' | 'star';

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
  color: string;
  /** Stroke thickness as a ratio of min(width, height). Ignored for filled shapes (star). */
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