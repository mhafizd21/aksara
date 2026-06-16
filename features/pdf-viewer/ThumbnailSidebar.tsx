'use client';

import { useRef, useEffect } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { PdfThumbnail } from '@/features/pdf-viewer/PdfThumbnail';
import { FileText } from 'lucide-react';

export function ThumbnailSidebar() {
  const { document: pdfDoc, currentPage, setCurrentPage } = useStudioStore();
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentPage]);

  if (!pdfDoc) {
    return (
      <aside className="w-[120px] sm:w-[140px] border-r border-gray-100 bg-gray-50/50 flex-col items-center justify-center shrink-0 hidden sm:flex">
        <FileText className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-xs text-gray-400 text-center px-3">Upload a PDF to see pages</p>
      </aside>
    );
  }

  return (
    <aside className="w-[120px] sm:w-[140px] border-r border-gray-100 bg-gray-50/50 flex-col shrink-0 overflow-hidden hidden sm:flex">
      <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pages</p>
        <p className="text-xs text-gray-400 mt-0.5">{pdfDoc.numPages} total</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Array.from({ length: pdfDoc.numPages }, (_, i) => (
          <div key={i} ref={currentPage === i ? activeRef : null}>
            <PdfThumbnail
              file={pdfDoc.file}
              pageIndex={i}
              isActive={currentPage === i}
              onClick={() => setCurrentPage(i)}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}