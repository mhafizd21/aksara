export type ElementType = 'signature' | 'text' | 'date';

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

export type PdfElement = SignatureElement | TextField | DateField;

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
