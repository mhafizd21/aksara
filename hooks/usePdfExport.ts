'use client';

import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import type { PdfElement, SignatureElement, TextField, DateField } from '@/types';

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function mapToStandardFont(fontFamily: string, StandardFonts: typeof import('pdf-lib').StandardFonts) {
  switch (fontFamily.trim().toLowerCase()) {
    case 'times new roman': case 'georgia': return StandardFonts.TimesRoman;
    case 'courier new': return StandardFonts.Courier;
    default: return StandardFonts.Helvetica;
  }
}

function hexToRgb(hex: string) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0,2),16)/255, parseInt(c.slice(2,4),16)/255, parseInt(c.slice(4,6),16)/255] as const;
}

/**
 * pdf-lib rotates CCW around the given (x,y) origin — not around center.
 * CSS rotates CW around center.
 *
 * To match: pass degrees(-cssRot) to pdf-lib, and compute the new origin
 * such that rotating CCW by -cssRot around it keeps the element center fixed.
 *
 * Unrotated bottom-left relative to center = (-w/2, -h/2).
 * Apply CCW rotation of angle r = -cssRot:
 *   rx = cos(r)*(-w/2) - sin(r)*(-h/2)
 *   ry = sin(r)*(-w/2) + cos(r)*(-h/2)
 */
function getRotatedOrigin(cx: number, cy: number, w: number, h: number, cssRotDeg: number) {
  const r = (-cssRotDeg * Math.PI) / 180;
  const lx = -w / 2;
  const ly = -h / 2;
  return {
    x: cx + Math.cos(r) * lx - Math.sin(r) * ly,
    y: cy + Math.sin(r) * lx + Math.cos(r) * ly,
  };
}

export function usePdfExport() {
  const { document: pdfDoc, elements, setIsExporting, downloadFileName } = useStudioStore();

  const exportPdf = useCallback(async () => {
    if (!pdfDoc) return;
    setIsExporting(true);
    try {
      const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');
      const arrayBuffer = await pdfDoc.file.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      const pages = doc.getPages();

      const processElement = async (el: PdfElement) => {
        const page = pages[el.pageIndex];
        if (!page) return;

        const { width: pdfW, height: pdfH } = page.getSize();
        const pageInfo = pdfDoc.pages[el.pageIndex];

        // pageInfo = pdfjs viewport at scale=1 (CSS px at 96dpi)
        // pdfW/pdfH = pdf-lib units (pt at 72dpi)
        const sx = pdfW / pageInfo.width;
        const sy = pdfH / pageInfo.height;

        const elW = el.size.width  * sx;
        const elH = el.size.height * sy;

        // Element center in PDF pt coords (Y-up from bottom)
        const cx = (el.position.x + el.size.width  / 2) * sx;
        const cy = pdfH - (el.position.y + el.size.height / 2) * sy;

        const rot = el.rotation ?? 0;

        if (el.type === 'signature') {
          const sigEl = el as SignatureElement;
          try {
            const bytes = dataUrlToUint8Array(sigEl.dataUrl);
            const isPng = sigEl.dataUrl.startsWith('data:image/png');
            const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            const origin = getRotatedOrigin(cx, cy, elW, elH, rot);
            page.drawImage(image, {
              x: origin.x, y: origin.y,
              width: elW, height: elH,
              rotate: degrees(-rot),
            });
          } catch { /* skip corrupt */ }

        } else if (el.type === 'text' || el.type === 'date') {
          const textEl = el as TextField | DateField;
          const font = await doc.embedFont(mapToStandardFont(textEl.fontFamily, StandardFonts));
          const [r, g, b] = hexToRgb(textEl.color);
          const fontSize = textEl.fontSize * sx;

          // Canvas renders text with `items-center` (flexbox vertical center).
          // pdf-lib draws from baseline. Baseline sits below the em-box center.
          // For Helvetica/Times/Courier: baseline ≈ center - fontSize * 0.35
          // (ascender ~0.7em above baseline → center of cap at ~0.35em above baseline)
          const baselineFromCenter = fontSize * 0.35;

          // Text local position relative to element center (PDF Y-up):
          // x: left edge + 8px padding → localX = paddingLeft - elW/2
          // y: baseline below center → localY = -baselineFromCenter
          const localX = 8 * sx - elW / 2;
          const localY = -baselineFromCenter;

          // Rotate local coords by CSS CW rotation around center
          const rr = (rot * Math.PI) / 180;
          const worldX = cx + (Math.cos(rr) * localX + Math.sin(rr) * localY);
          const worldY = cy + (-Math.sin(rr) * localX + Math.cos(rr) * localY);

          page.drawText(textEl.content, {
            x: worldX, y: worldY,
            size: fontSize,
            font,
            color: rgb(r, g, b),
            rotate: degrees(-rot),
          });
        }
      };

      for (const el of elements) await processElement(el);

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = downloadFileName.trim() || pdfDoc.file.name.replace(/\.pdf$/i, '') + '_signed';
      const fileName = baseName.endsWith('.pdf') ? baseName : baseName + '.pdf';
      const a = window.document.createElement('a');
      a.href = url; a.download = fileName; a.style.display = 'none';
      window.document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); window.document.body.removeChild(a); }, 1000);
    } finally {
      setIsExporting(false);
    }
  }, [pdfDoc, elements, setIsExporting, downloadFileName]);

  return { exportPdf };
}