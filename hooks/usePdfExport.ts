'use client';

import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import type { PdfElement, SignatureElement, TextField, DateField } from '@/types';

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function mapToStandardFont(fontFamily: string, StandardFonts: typeof import('pdf-lib').StandardFonts) {
  const key = fontFamily.trim().toLowerCase();
  switch (key) {
    case 'times new roman':
    case 'georgia':
      return StandardFonts.TimesRoman;
    case 'courier new':
      return StandardFonts.Courier;
    case 'arial':
    case 'helvetica':
    default:
      return StandardFonts.Helvetica;
  }
}

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

        const pdfX         = (el.position.x / scale) * (pdfW / pageInfo.width);
        const pdfY_fromTop = (el.position.y / scale) * (pdfH / pageInfo.height);
        const pdfElW       = (el.size.width  / scale) * (pdfW / pageInfo.width);
        const pdfElH       = (el.size.height / scale) * (pdfH / pageInfo.height);
        const pdfY         = pdfH - pdfY_fromTop - pdfElH;

        if (el.type === 'signature') {
          const sigEl = el as SignatureElement;
          try {
            const bytes = dataUrlToUint8Array(sigEl.dataUrl);
            const isPng = sigEl.dataUrl.startsWith('data:image/png');
            const image = isPng
              ? await doc.embedPng(bytes)
              : await doc.embedJpg(bytes);
            page.drawImage(image, { x: pdfX, y: pdfY, width: pdfElW, height: pdfElH });
          } catch {
            // Skip corrupt image
          }
        } else if (el.type === 'text' || el.type === 'date') {
          const textEl = el as TextField | DateField;
          const standardFont = mapToStandardFont(textEl.fontFamily, StandardFonts);
          const font = await doc.embedFont(standardFont);

          const hexToRgb = (hex: string) => {
            const clean = hex.replace('#', '');
            return rgb(
              parseInt(clean.slice(0, 2), 16) / 255,
              parseInt(clean.slice(2, 4), 16) / 255,
              parseInt(clean.slice(4, 6), 16) / 255,
            );
          };

          const pdfFontSize = (textEl.fontSize / scale) * (pdfW / pageInfo.width);
          const textY = pdfY + (pdfElH - pdfFontSize) / 2 + pdfFontSize * 0.2;

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

      const baseName = downloadFileName.trim()
        || pdfDoc.file.name.replace(/\.pdf$/i, '') + '_signed';
      const fileName = baseName.endsWith('.pdf') ? baseName : baseName + '.pdf';

      // Mobile-compatible: append to body before click, remove after
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      window.document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      }, 1000);
    } finally {
      setIsExporting(false);
    }
  }, [pdfDoc, elements, scale, setIsExporting, downloadFileName]);

  return { exportPdf };
}