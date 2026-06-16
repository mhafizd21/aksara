'use client';

import { useRef, useCallback, useState } from 'react';
import {
  Upload, Type, Calendar, PenLine, Undo2, Redo2,
  Download, Loader2, ChevronLeft, ChevronRight, X,
  Menu, FileEdit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/stores/studio.store';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { usePdfExport } from '@/hooks/usePdfExport';

export function Toolbar() {
  const {
    document: pdfDoc, setDocument, activeToolMode, setActiveToolMode,
    undo, redo, history, historyIndex,
    isExporting, setSignatureModalOpen, currentPage, setCurrentPage,
    pendingSignatureDataUrl, cancelSignaturePlacement,
    downloadFileName, setDownloadFileName,
  } = useStudioStore();

  const { loading, error, loadPdf } = usePdfLoader();
  const { exportPdf } = usePdfExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingFileName, setEditingFileName] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const doc = await loadPdf(file);
    if (doc) setDocument(doc);
    e.target.value = '';
    setMobileMenuOpen(false);
  }, [loadPdf, setDocument]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isPlacing = activeToolMode === 'signature' && !!pendingSignatureDataUrl;

  const tools = [
    { id: 'text' as const, icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'date' as const, icon: Calendar, label: 'Date', shortcut: 'D' },
    { id: 'signature' as const, icon: PenLine, label: 'Sign', shortcut: 'S' },
  ];

  const handleToolClick = (id: 'text' | 'date' | 'signature') => {
    if (id === 'signature') { setSignatureModalOpen(true); }
    else { setActiveToolMode(activeToolMode === id ? 'select' : id); }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 gap-1.5 shrink-0 z-40">
        <div className="flex items-center gap-2 mr-2 shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <PenLine className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-wide hidden sm:block">AKSARA</span>
        </div>

        <div className="w-px h-6 bg-gray-100 mx-0.5 hidden sm:block" />

        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        <ToolButton icon={loading ? Loader2 : Upload} label="Upload" onClick={() => fileInputRef.current?.click()} loading={loading} primary />

        {isPlacing ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg ml-1">
            <span className="text-xs font-medium text-blue-700 hidden sm:block">Click PDF to place</span>
            <span className="text-xs font-medium text-blue-700 sm:hidden">Place sign</span>
            <button onClick={cancelSignaturePlacement} className="p-0.5 hover:bg-blue-100 rounded" title="Cancel (ESC)">
              <X className="w-3.5 h-3.5 text-blue-500" />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 ml-0.5">
            <div className="w-px h-6 bg-gray-100 mx-0.5" />
            {tools.map((tool) => (
              <ToolButton key={tool.id} icon={tool.icon} label={tool.label} shortcut={tool.shortcut}
                active={activeToolMode === tool.id} disabled={!pdfDoc}
                onClick={() => handleToolClick(tool.id)} />
            ))}
          </div>
        )}

        <div className="hidden md:flex items-center gap-1">
          <div className="w-px h-6 bg-gray-100 mx-0.5" />
          <ToolButton icon={Undo2} label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={undo} />
          <ToolButton icon={Redo2} label="Redo" shortcut="⌘Y" disabled={!canRedo} onClick={redo} />
        </div>

        {pdfDoc && (
          <div className="hidden md:flex items-center gap-1">
            <div className="w-px h-6 bg-gray-100 mx-0.5" />
            <ToolButton icon={ChevronLeft} label="Prev" disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)} />
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
              <input type="number" min={1} max={pdfDoc.numPages} value={currentPage + 1}
                onChange={(e) => { const v = Number(e.target.value) - 1; if (v >= 0 && v < pdfDoc.numPages) setCurrentPage(v); }}
                className="w-7 text-center text-xs bg-transparent focus:outline-none text-gray-700 font-medium" />
              <span className="text-xs text-gray-400">/ {pdfDoc.numPages}</span>
            </div>
            <ToolButton icon={ChevronRight} label="Next" disabled={currentPage === pdfDoc.numPages - 1} onClick={() => setCurrentPage(currentPage + 1)} />
          </div>
        )}

        <div className="flex-1" />

        {error && <span className="text-xs text-red-500 max-w-[120px] truncate hidden lg:block">{error}</span>}

        {pdfDoc && (
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            {editingFileName ? (
              <input
                value={downloadFileName}
                onChange={(e) => setDownloadFileName(e.target.value)}
                onBlur={() => setEditingFileName(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingFileName(false); }}
                className="text-xs border border-blue-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-40 bg-white"
                autoFocus
              />
            ) : (
              <button onClick={() => setEditingFileName(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors group max-w-[160px]"
                title="Click to rename">
                <FileEdit className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{downloadFileName || pdfDoc.file.name}.pdf</span>
              </button>
            )}
          </div>
        )}

        <div className="w-px h-6 bg-gray-100 mx-0.5 hidden sm:block" />

        <button onClick={exportPdf} disabled={!pdfDoc || isExporting}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0',
            !pdfDoc || isExporting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
          )}>
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">{isExporting ? 'Saving…' : 'Download'}</span>
        </button>

        <button onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors ml-1">
          <Menu className="w-4 h-4 text-gray-600" />
        </button>
      </header>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-14 right-0 left-0 z-50 bg-white border-b border-gray-200 shadow-xl md:hidden">
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pb-1">Annotate</p>
              {!isPlacing && tools.map((tool) => (
                <MobileMenuItem key={tool.id} icon={tool.icon} label={tool.label}
                  active={activeToolMode === tool.id} disabled={!pdfDoc}
                  onClick={() => handleToolClick(tool.id)} />
              ))}

              <div className="border-t border-gray-100 my-2" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pb-1">History</p>
              <div className="flex gap-2">
                <MobileMenuItem icon={Undo2} label="Undo" disabled={!canUndo} onClick={() => { undo(); setMobileMenuOpen(false); }} />
                <MobileMenuItem icon={Redo2} label="Redo" disabled={!canRedo} onClick={() => { redo(); setMobileMenuOpen(false); }} />
              </div>

              {pdfDoc && (
                <>
                  <div className="border-t border-gray-100 my-2" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pb-1">Pages</p>
                  <div className="flex items-center gap-2 px-2">
                    <button disabled={currentPage === 0}
                      onClick={() => { setCurrentPage(currentPage - 1); setMobileMenuOpen(false); }}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-700 font-medium">{currentPage + 1} / {pdfDoc.numPages}</span>
                    <button disabled={currentPage === pdfDoc.numPages - 1}
                      onClick={() => { setCurrentPage(currentPage + 1); setMobileMenuOpen(false); }}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border-t border-gray-100 my-2" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pb-1">Download filename</p>
                  <div className="px-2">
                    <input value={downloadFileName} onChange={(e) => setDownloadFileName(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="filename" />
                    <p className="text-xs text-gray-400 mt-1">.pdf will be appended</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string; shortcut?: string; active?: boolean;
  disabled?: boolean; loading?: boolean; primary?: boolean;
  onClick: () => void;
}

function ToolButton({ icon: Icon, label, shortcut, active, disabled, loading, primary, onClick }: ToolButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all',
        active && 'bg-blue-50 text-blue-600',
        primary && !active && 'border border-gray-200 text-gray-700 hover:bg-gray-50',
        !active && !primary && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        (disabled || loading) && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}>
      <Icon className={cn('w-4 h-4', loading && 'animate-spin')} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function MobileMenuItem({ icon: Icon, label, active, disabled, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
        active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50',
        disabled && 'opacity-40 cursor-not-allowed',
      )}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}