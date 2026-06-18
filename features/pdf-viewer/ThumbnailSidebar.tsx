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

  return (
    <aside className="w-45 shrink-0 flex-col overflow-hidden hidden sm:flex"
      style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="label">Pages</p>
        {pdfDoc && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{pdfDoc.numPages} total</p>}
      </div>
      {!pdfDoc ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
          <FileText className="w-6 h-6" style={{ color: 'var(--color-border)' }} />
          <p className="text-xs text-center" style={{ color: 'var(--color-text-disabled)' }}>No PDF loaded</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Array.from({ length: pdfDoc.numPages }, (_, i) => (
            <div key={i} ref={currentPage === i ? activeRef : null}>
              <PdfThumbnail file={pdfDoc.file} pageIndex={i} isActive={currentPage === i} onClick={() => setCurrentPage(i)} />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}