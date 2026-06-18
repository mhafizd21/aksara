'use client';

import { Toolbar } from '@/features/pdf-editor/Toolbar';
import { ThumbnailSidebar } from '@/features/pdf-viewer/ThumbnailSidebar';
import { PdfCanvas } from '@/features/pdf-editor/PdfCanvas';
import { PropertiesPanel } from '@/features/pdf-editor/PropertiesPanel';
import { ZoomControls } from '@/features/pdf-editor/ZoomControls';
import { SignatureModal } from '@/features/signature/SignatureModal';
import { UploadDropZone } from '@/features/pdf-editor/UploadDropZone';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStudioStore } from '@/stores/studio.store';

export default function StudioPage() {
  useKeyboardShortcuts();
  const { document: pdfDoc } = useStudioStore();

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--color-background)', fontFamily: 'var(--font-family)' }}
    >
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <ThumbnailSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          {pdfDoc ? <PdfCanvas /> : <UploadDropZone />}
          <ZoomControls />
        </main>
        <PropertiesPanel />
      </div>
      <SignatureModal />
    </div>
  );
}