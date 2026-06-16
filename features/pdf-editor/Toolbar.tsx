'use client';

import { useRef, useCallback } from 'react';
import {
  Upload, Type, Calendar, PenLine, Undo2, Redo2,
  Download, Loader2, ChevronLeft, ChevronRight, X,
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
  } = useStudioStore();

  const { loading, error, loadPdf } = usePdfLoader();
  const { exportPdf } = usePdfExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const doc = await loadPdf(file);
    if (doc) setDocument(doc);
    e.target.value = '';
  }, [loadPdf, setDocument]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const tools = [
    { id: 'text' as const, icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'date' as const, icon: Calendar, label: 'Date', shortcut: 'D' },
    { id: 'signature' as const, icon: PenLine, label: 'Signature', shortcut: 'S' },
  ];

  const handleToolClick = (id: 'text' | 'date' | 'signature') => {
    if (id === 'signature') {
      setSignatureModalOpen(true);
    } else {
      setActiveToolMode(activeToolMode === id ? 'select' : id);
    }
  };

  const isPlacing = activeToolMode === 'signature' && !!pendingSignatureDataUrl;

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <PenLine className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">PDF Studio</span>
      </div>

      <div className="w-px h-6 bg-gray-100 mx-1" />

      {/* Upload */}
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
      <ToolButton
        icon={loading ? Loader2 : Upload}
        label="Upload PDF"
        onClick={() => fileInputRef.current?.click()}
        loading={loading}
        primary
      />

      <div className="w-px h-6 bg-gray-100 mx-1" />

      {/* Tool buttons — hidden during placement */}
      {!isPlacing && tools.map((tool) => (
        <ToolButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          active={activeToolMode === tool.id}
          disabled={!pdfDoc}
          onClick={() => handleToolClick(tool.id)}
        />
      ))}

      {/* Placement mode indicator */}
      {isPlacing && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs font-medium text-blue-700">Click PDF to place signature</span>
          <button
            onClick={cancelSignaturePlacement}
            className="p-0.5 hover:bg-blue-100 rounded transition-colors"
            title="Cancel (ESC)"
          >
            <X className="w-3.5 h-3.5 text-blue-500" />
          </button>
        </div>
      )}

      <div className="w-px h-6 bg-gray-100 mx-1" />

      {/* Undo / Redo */}
      <ToolButton icon={Undo2} label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={undo} />
      <ToolButton icon={Redo2} label="Redo" shortcut="⌘Y" disabled={!canRedo} onClick={redo} />

      {/* Page nav */}
      {pdfDoc && (
        <>
          <div className="w-px h-6 bg-gray-100 mx-1" />
          <div className="flex items-center gap-1.5">
            <ToolButton
              icon={ChevronLeft}
              label="Prev page"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            />
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
              <input
                type="number"
                min={1}
                max={pdfDoc.numPages}
                value={currentPage + 1}
                onChange={(e) => {
                  const v = Number(e.target.value) - 1;
                  if (v >= 0 && v < pdfDoc.numPages) setCurrentPage(v);
                }}
                className="w-8 text-center text-xs bg-transparent focus:outline-none text-gray-700 font-medium"
              />
              <span className="text-xs text-gray-400">/ {pdfDoc.numPages}</span>
            </div>
            <ToolButton
              icon={ChevronRight}
              label="Next page"
              disabled={currentPage === pdfDoc.numPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            />
          </div>
        </>
      )}

      <div className="flex-1" />

      {error && (
        <span className="text-xs text-red-500 max-w-[200px] truncate hidden sm:block">{error}</span>
      )}

      {pdfDoc && (
        <span className="text-xs text-gray-400 max-w-[160px] truncate hidden sm:block">
          {pdfDoc.file.name}
        </span>
      )}

      <div className="w-px h-6 bg-gray-100 mx-1" />

      {/* Export */}
      <button
        onClick={exportPdf}
        disabled={!pdfDoc || isExporting}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          !pdfDoc || isExporting
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
        )}
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isExporting ? 'Exporting…' : 'Download'}
      </button>
    </header>
  );
}

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  primary?: boolean;
  onClick: () => void;
}

function ToolButton({ icon: Icon, label, shortcut, active, disabled, loading, primary, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all',
        active && 'bg-blue-50 text-blue-600',
        primary && !active && 'border border-gray-200 text-gray-700 hover:bg-gray-50',
        !active && !primary && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        (disabled || loading) && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      <Icon className={cn('w-4 h-4', loading && 'animate-spin')} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}