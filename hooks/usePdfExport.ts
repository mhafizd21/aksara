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

function hexToRgbValues(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0,2),16)/255, parseInt(c.slice(2,4),16)/255, parseInt(c.slice(4,6),16)/255];
}

/**
 * pdf-lib rotates around the element's own bottom-left corner (in PDF coords = top-left visually).
 * CSS rotates around the element's center.
 * 
 * To make pdf-lib match CSS rotation:
 * 1. Find the visual center in PDF coords (origin bottom-left, Y up).
 * 2. The rotated bottom-left that puts center at the same spot:
 *    newOrigin = center + R(-θ) * (-w/2, -h/2)
 *    where R(-θ) is rotation matrix for -θ (pdf-lib rotates CCW, CSS rotates CW).
 */
function rotatedOrigin(
  cx: number, cy: number,   // center in PDF coords (Y-up)
  w: number,  h: number,    // element size in PDF units
  deg: number               // CSS rotation in degrees (CW)
): { x: number; y: number } {
  // pdf-lib rotates CCW by `degrees(deg)`, but CSS rotates CW by `deg`.
  // To match CSS CW rotation, we pass degrees(-deg) to pdf-lib.
  // The bottom-left of the element in its local frame is (-w/2, -h/2) from center.
  // After a CW rotation of `deg` degrees, the bottom-left maps to:
  //   x' = cos(-deg)*(-w/2) - sin(-deg)*(-h/2)  =  -cos(r)*w/2 - sin(r)*h/2
  //   y' = sin(-deg)*(-w/2) + cos(-deg)*(-h/2)  =   sin(r)*w/2 - cos(r)*h/2
  // where r = deg in radians
  const r = (deg * Math.PI) / 180;
  const dx = -Math.cos(r) * (w / 2) - Math.sin(r) * (h / 2);
  const dy =  Math.sin(r) * (w / 2) - Math.cos(r) * (h / 2);
  return { x: cx + dx, y: cy + dy };
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

        // Map from pdfjs-scale-1 units → pdf-lib units
        const scaleX = pdfW / pageInfo.width;
        const scaleY = pdfH / pageInfo.height;

        // Element dimensions in PDF units
        const elW = el.size.width  * scaleX;
        const elH = el.size.height * scaleY;

        // Element top-left in PDF units (Y-down from top)
        const elTopLeftX = el.position.x * scaleX;
        const elTopLeftY = el.position.y * scaleY;

        // Center of element in PDF coords (Y-up from bottom)
        // Visual center is always at position + size/2 regardless of rotation,
        // because CSS transform-origin is center.
        const cx = elTopLeftX + elW / 2;
        const cy = pdfH - elTopLeftY - elH / 2;  // convert Y-down → Y-up

        const rot = el.rotation ?? 0;

        if (el.type === 'signature') {
          const sigEl = el as SignatureElement;
          try {
            const bytes = dataUrlToUint8Array(sigEl.dataUrl);
            const isPng = sigEl.dataUrl.startsWith('data:image/png');
            const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            const origin = rotatedOrigin(cx, cy, elW, elH, rot);
            page.drawImage(image, {
              x: origin.x,
              y: origin.y,
              width: elW,
              height: elH,
              rotate: degrees(-rot),
            });
          } catch { /* skip corrupt image */ }

        } else if (el.type === 'text' || el.type === 'date') {
          const textEl = el as TextField | DateField;
          const font = await doc.embedFont(mapToStandardFont(textEl.fontFamily, StandardFonts));
          const [r, g, b] = hexToRgbValues(textEl.color);

          const pdfFontSize = textEl.fontSize * scaleX;

          // Without rotation: text baseline sits at pdfY + vertical centering offset
          // Text is drawn from baseline, so we center it vertically within elH.
          // Baseline offset from bottom of box ≈ (elH - fontSize) / 2 + fontSize * 0.2
          const baselineOffsetFromBottom = (elH - pdfFontSize) / 2 + pdfFontSize * 0.2;

          // In local element coords (bottom-left origin, no rotation):
          // text x = 8px padding mapped to pdf units, text y = baselineOffsetFromBottom
          const localTextX = 8 * scaleX;
          const localTextY = baselineOffsetFromBottom;

          // The element's bottom-left in PDF coords (Y-up) without rotation:
          const elBottomLeftX = cx - elW / 2;
          const elBottomLeftY = cy - elH / 2;

          // Apply CW rotation `rot` to the local text offset around element center (0,0 in local = center):
          const localDx = localTextX - elW / 2;
          const localDy = localTextY - elH / 2;
          const rr = (rot * Math.PI) / 180;
          const rotatedDx =  Math.cos(rr) * localDx + Math.sin(rr) * localDy;
          const rotatedDy = -Math.sin(rr) * localDx + Math.cos(rr) * localDy;

          const textX = cx + rotatedDx;
          const textY = cy + rotatedDy;

          // For text, pdf-lib also rotates CCW around the given (x,y).
          // We want CW rotation = CCW of -rot.
          page.drawText(textEl.content, {
            x: textX,
            y: textY,
            size: pdfFontSize,
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