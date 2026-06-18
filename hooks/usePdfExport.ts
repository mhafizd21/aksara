'use client';

import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import type { PdfElement, SignatureElement, TextField, DateField } from '@/types';
import { dataUrlToUint8Array } from '@/lib/utils';

export function usePdfExport() {
  const { document: pdfDoc, elements, scale, setIsExporting, downloadFileName } = useStudioStore();

  const exportPdf = useCallback(async () => {
    if (!pdfDoc) return;
    setIsExporting(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const arrayBuffer = await pdfDoc.file.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      const pages = doc.getPages();

      const processElement = async (el: PdfElement) => {
        const page = pages[el.pageIndex];
        if (!page) return;

        const { width: pdfW, height: pdfH } = page.getSize();
        const pageInfo = pdfDoc.pages[el.pageIndex];

        // el.position / el.size are stored in scaled canvas pixels
        // Convert: scaled px → unscaled PDF units → pdf-lib points
        const pdfX      = (el.position.x / scale) * (pdfW / pageInfo.width);
        const pdfYTop   = (el.position.y / scale) * (pdfH / pageInfo.height);
        const pdfElW    = (el.size.width  / scale) * (pdfW / pageInfo.width);
        const pdfElH    = (el.size.height / scale) * (pdfH / pageInfo.height);

        // pdf-lib origin is bottom-left; flip Y
        const pdfY = pdfH - pdfYTop - pdfElH;

        if (el.type === 'signature') {
          const sigEl = el as SignatureElement;
          try {
            const bytes = dataUrlToUint8Array(sigEl.dataUrl);
            const isPng = sigEl.dataUrl.startsWith('data:image/png');
            const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            page.drawImage(image, { x: pdfX, y: pdfY, width: pdfElW, height: pdfElH });
          } catch { /* skip corrupt */ }
        } else if (el.type === 'text' || el.type === 'date') {
          const textEl = el as TextField | DateField;
          const font = await doc.embedFont(StandardFonts.Helvetica);

          const hexToRgb = (hex: string) => {
            const c = hex.replace('#', '');
            return rgb(
              parseInt(c.slice(0, 2), 16) / 255,
              parseInt(c.slice(2, 4), 16) / 255,
              parseInt(c.slice(4, 6), 16) / 255,
            );
          };

          const pdfFontSize = (textEl.fontSize / scale) * (pdfW / pageInfo.width);
          const textY = pdfY + (pdfElH - pdfFontSize) / 2;

          page.drawText(textEl.content, {
            x: pdfX,
            y: textY,
            size: pdfFontSize,
            font,
            color: hexToRgb(textEl.color),
          });
        }
      };

      for (const el of elements) await processElement(el);

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      const baseName = downloadFileName.trim() || pdfDoc.file.name.replace(/\.pdf$/i, '') + '_signed';
      a.download = baseName.endsWith('.pdf') ? baseName : baseName + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [pdfDoc, elements, scale, setIsExporting, downloadFileName]);

  return { exportPdf };
}