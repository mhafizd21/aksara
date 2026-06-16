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
        const { height: pageHeight } = page.getSize();
        const pageInfo = pdfDoc.pages[el.pageIndex];
        const scaleX = page.getWidth() / (pageInfo.width * scale);
        const scaleY = pageHeight / (pageInfo.height * scale);

        const x = el.position.x * scaleX;
        const y = pageHeight - (el.position.y * scaleY) - (el.size.height * scaleY);
        const w = el.size.width * scaleX;
        const h = el.size.height * scaleY;

        if (el.type === 'signature') {
          const sigEl = el as SignatureElement;
          try {
            const bytes = dataUrlToUint8Array(sigEl.dataUrl);
            const mediaType = sigEl.dataUrl.startsWith('data:image/png') ? 'png' : 'jpeg';
            const image = mediaType === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            page.drawImage(image, { x, y, width: w, height: h });
          } catch { /* skip */ }
        } else if (el.type === 'text' || el.type === 'date') {
          const textEl = el as TextField | DateField;
          const font = await doc.embedFont(StandardFonts.Helvetica);
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
          };
          page.drawText(textEl.content, {
            x, y: y + h / 2,
            size: textEl.fontSize * Math.min(scaleX, scaleY),
            font, color: hexToRgb(textEl.color),
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