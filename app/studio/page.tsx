'use client';

import { Toolbar } from '@/features/pdf-editor/Toolbar';
import { ThumbnailSidebar } from '@/features/pdf-viewer/ThumbnailSidebar';
import { PdfCanvas } from '@/features/pdf-editor/PdfCanvas';
import { PropertiesPanel, MobilePropertiesSheet } from '@/features/pdf-editor/PropertiesPanel';
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
        {/*
          Mobile: bottom padding = height of bottom action bar (primary ~64px +
          secondary ~40px) + some breathing room = ~120px.
          Desktop: no extra padding needed (md:pb-0).
        */}
        <main className="flex flex-1 flex-col overflow-hidden pb-[120px] md:pb-0">
          {pdfDoc ? <PdfCanvas /> : <UploadDropZone />}
          {/* ZoomControls renders a desktop footer + mobile floating pill */}
          <ZoomControls />
        </main>
        <PropertiesPanel />
      </div>
      {/* Mobile Vaul drawer — only rendered on sm: breakpoint and below */}
      <MobilePropertiesSheet />
      <SignatureModal />
    </div>
  );
}