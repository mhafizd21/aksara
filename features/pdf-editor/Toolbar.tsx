'use client';

import { useRef, useCallback, useState } from 'react';
import {
  Upload, Type, Calendar, PenLine, Undo2, Redo2,
  Download, Loader2, ChevronLeft, ChevronRight, X,
  Menu, FileEdit, Check, Circle, Star, Shapes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/stores/studio.store';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { usePdfExport } from '@/hooks/usePdfExport';
import { SYMBOL_SHAPES, SYMBOL_DEFAULT_COLOR, SYMBOL_PRESET_COLORS } from '@/lib/constants';
import type { SymbolShape } from '@/types';
import Image from 'next/image';

export function Toolbar() {
  const {
    document: pdfDoc, setDocument, activeToolMode, setActiveToolMode,
    undo, redo, history, historyIndex,
    isExporting, setSignatureModalOpen, currentPage, setCurrentPage,
    pendingSignatureDataUrl, cancelSignaturePlacement,
    downloadFileName, setDownloadFileName,
    selectedSymbolShape, selectedSymbolColor, setSelectedSymbolShape, setSelectedSymbolColor,
  } = useStudioStore();

  const { loading, error, loadPdf } = usePdfLoader();
  const { exportPdf } = usePdfExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingFileName, setEditingFileName] = useState(false);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);

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

  const SYMBOL_ICONS: Record<SymbolShape, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    check: Check, cross: X, circle: Circle, star: Star,
  };

  const pickSymbol = (shape: SymbolShape) => {
    setSelectedSymbolShape(shape);
    setActiveToolMode('symbol');
    setSymbolPickerOpen(false);
    setMobileMenuOpen(false);
  };

  const handleToolClick = (id: 'text' | 'date' | 'signature') => {
    if (id === 'signature') { setSignatureModalOpen(true); }
    else { setActiveToolMode(activeToolMode === id ? 'select' : id); }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className="h-14 flex items-center px-4 gap-2 shrink-0 z-40"
        style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-3 shrink-0">
          {/* <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
            style={{ background: 'var(--color-primary)' }}>
            <PenLine className="w-4 h-4 text-white" />
          </div> */}
          <Image src="/favicon-32x32.png" alt="AKSARA" width={32} height={32} className="w-8 h-8" />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)', letterSpacing: '0.12em' }}>
              AKSARA
            </span>
            <span className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.06em' }}>
              Document Workspace
            </span>
          </div>
        </div>

        <div className="w-px h-6 shrink-0 hidden sm:block" style={{ background: 'var(--color-border)' }} />

        {/* Upload */}
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        <ToolBtn icon={loading ? Loader2 : Upload} label="Upload" onClick={() => fileInputRef.current?.click()} loading={loading} variant="secondary" />

        {/* Placement banner OR tools */}
        {isPlacing ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg ml-1"
            style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
            <span className="text-xs font-medium hidden sm:block" style={{ color: 'var(--color-primary)' }}>
              Click PDF to place signature
            </span>
            <span className="text-xs font-medium sm:hidden" style={{ color: 'var(--color-primary)' }}>
              Click to place
            </span>
            <button onClick={cancelSignaturePlacement} className="p-0.5 rounded hover:bg-indigo-100 transition-colors">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 relative">
            <div className="w-px h-5 shrink-0" style={{ background: 'var(--color-border)' }} />
            {tools.map((tool) => (
              <ToolBtn key={tool.id} icon={tool.icon} label={tool.label} shortcut={tool.shortcut}
                active={activeToolMode === tool.id} disabled={!pdfDoc}
                onClick={() => handleToolClick(tool.id)} />
            ))}
            <ToolBtn icon={Shapes} label="Symbol" shortcut="K" disabled={!pdfDoc}
              active={activeToolMode === 'symbol'}
              onClick={() => setSymbolPickerOpen((v) => !v)} />

            {symbolPickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSymbolPickerOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-50 p-3 rounded-xl"
                  style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', width: 220 }}
                  onClick={(e) => e.stopPropagation()}>
                  <p className="label mb-2">Symbol shape</p>
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {SYMBOL_SHAPES.map((shape) => {
                      const Icon = SYMBOL_ICONS[shape];
                      return (
                        <button key={shape} onClick={() => pickSymbol(shape)}
                          title={shape}
                          className="flex items-center justify-center h-9 rounded-lg transition-colors"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}>
                          <Icon className="w-4 h-4" style={{ color: SYMBOL_DEFAULT_COLOR[shape] }} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="label mb-2">Color</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SYMBOL_PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => setSelectedSymbolColor(c)}
                        className="w-6 h-6 rounded-full shrink-0"
                        style={{ background: c, border: selectedSymbolColor === c ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }} />
                    ))}
                    <input type="color" value={selectedSymbolColor}
                      onChange={(e) => setSelectedSymbolColor(e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer shrink-0" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Undo / Redo */}
        <div className="hidden md:flex items-center gap-1">
          <div className="w-px h-5 shrink-0 ml-1" style={{ background: 'var(--color-border)' }} />
          <ToolBtn icon={Undo2} label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={undo} iconOnly />
          <ToolBtn icon={Redo2} label="Redo" shortcut="⌘Y" disabled={!canRedo} onClick={redo} iconOnly />
        </div>

        {/* Page nav */}
        {pdfDoc && (
          <div className="hidden md:flex items-center gap-1">
            <div className="w-px h-5 shrink-0 ml-1" style={{ background: 'var(--color-border)' }} />
            <ToolBtn icon={ChevronLeft} label="Prev" disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)} iconOnly />
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <input type="number" min={1} max={pdfDoc.numPages} value={currentPage + 1}
                onChange={(e) => { const v = Number(e.target.value) - 1; if (v >= 0 && v < pdfDoc.numPages) setCurrentPage(v); }}
                className="w-6 text-center bg-transparent focus:outline-none font-medium"
                style={{ fontSize: 12, color: 'var(--color-text-primary)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>/ {pdfDoc.numPages}</span>
            </div>
            <ToolBtn icon={ChevronRight} label="Next" disabled={currentPage === pdfDoc.numPages - 1} onClick={() => setCurrentPage(currentPage + 1)} iconOnly />
          </div>
        )}

        <div className="flex-1" />

        {error && <span className="text-xs truncate max-w-[120px] hidden lg:block" style={{ color: 'var(--color-danger)' }}>{error}</span>}

        {/* Filename editor */}
        {pdfDoc && (
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            {editingFileName ? (
              <input value={downloadFileName} onChange={(e) => setDownloadFileName(e.target.value)}
                onBlur={() => setEditingFileName(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingFileName(false); }}
                className="text-xs px-2 py-1 rounded-lg w-40 focus:outline-none"
                style={{ border: '1px solid var(--color-primary)', boxShadow: '0 0 0 3px rgb(67 56 202 / 0.12)', color: 'var(--color-text-primary)', background: 'var(--color-background)', fontSize: 12 }}
                autoFocus />
            ) : (
              <button onClick={() => setEditingFileName(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors group max-w-[160px]"
                style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
                title="Click to rename"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <FileEdit className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{downloadFileName || pdfDoc.file.name}.pdf</span>
              </button>
            )}
          </div>
        )}

        <div className="w-px h-5 shrink-0 hidden sm:block" style={{ background: 'var(--color-border)' }} />

        {/* Download */}
        <button onClick={exportPdf} disabled={!pdfDoc || isExporting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0"
          style={!pdfDoc || isExporting
            ? { background: 'var(--color-surface)', color: 'var(--color-text-disabled)', cursor: 'not-allowed', border: '1px solid var(--color-border)' }
            : { background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
          onMouseEnter={(e) => { if (pdfDoc && !isExporting) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)'; }}
          onMouseLeave={(e) => { if (pdfDoc && !isExporting) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'; }}>
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">{isExporting ? 'Saving…' : 'Download'}</span>
        </button>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg transition-colors ml-1"
          style={{ color: 'var(--color-text-secondary)' }}>
          <Menu className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/25" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-14 right-0 left-0 z-50 md:hidden"
            style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="p-3 space-y-0.5">
              <p className="label px-3 py-2">Annotate</p>
              {!isPlacing && tools.map((tool) => (
                <MobileItem key={tool.id} icon={tool.icon} label={tool.label}
                  active={activeToolMode === tool.id} disabled={!pdfDoc}
                  onClick={() => handleToolClick(tool.id)} />
              ))}
              {!isPlacing && pdfDoc && (
                <div className="px-3 py-1.5">
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Symbol</p>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {SYMBOL_SHAPES.map((shape) => {
                      const Icon = SYMBOL_ICONS[shape];
                      const active = activeToolMode === 'symbol' && selectedSymbolShape === shape;
                      return (
                        <button key={shape} onClick={() => pickSymbol(shape)}
                          className="flex items-center justify-center h-9 rounded-lg"
                          style={{ background: active ? '#EEF2FF' : 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                          <Icon className="w-4 h-4" style={{ color: SYMBOL_DEFAULT_COLOR[shape] }} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SYMBOL_PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => setSelectedSymbolColor(c)}
                        className="w-6 h-6 rounded-full shrink-0"
                        style={{ background: c, border: selectedSymbolColor === c ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }} />
                    ))}
                  </div>
                </div>
              )}
              <div className="h-px mx-1 my-2" style={{ background: 'var(--color-border)' }} />
              <p className="label px-3 py-1">History</p>
              <div className="flex gap-1">
                <MobileItem icon={Undo2} label="Undo" disabled={!canUndo} onClick={() => { undo(); setMobileMenuOpen(false); }} />
                <MobileItem icon={Redo2} label="Redo" disabled={!canRedo} onClick={() => { redo(); setMobileMenuOpen(false); }} />
              </div>
              {pdfDoc && (
                <>
                  <div className="h-px mx-1 my-2" style={{ background: 'var(--color-border)' }} />
                  <p className="label px-3 py-1">Pages</p>
                  <div className="flex items-center gap-2 px-3 py-1">
                    <button disabled={currentPage === 0}
                      onClick={() => { setCurrentPage(currentPage - 1); setMobileMenuOpen(false); }}
                      className="p-2 rounded-lg disabled:opacity-40" style={{ background: 'var(--color-surface)' }}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {currentPage + 1} / {pdfDoc.numPages}
                    </span>
                    <button disabled={currentPage === pdfDoc.numPages - 1}
                      onClick={() => { setCurrentPage(currentPage + 1); setMobileMenuOpen(false); }}
                      className="p-2 rounded-lg disabled:opacity-40" style={{ background: 'var(--color-surface)' }}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="h-px mx-1 my-2" style={{ background: 'var(--color-border)' }} />
                  <p className="label px-3 py-1">Download filename</p>
                  <div className="px-3 pb-2">
                    <input value={downloadFileName} onChange={(e) => setDownloadFileName(e.target.value)}
                      className="input" placeholder="filename" />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>.pdf will be appended</p>
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

interface ToolBtnProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string; shortcut?: string; active?: boolean;
  disabled?: boolean; loading?: boolean; iconOnly?: boolean;
  variant?: 'ghost' | 'secondary';
  onClick: () => void;
}

function ToolBtn({ icon: Icon, label, shortcut, active, disabled, loading, iconOnly, variant = 'ghost', onClick }: ToolBtnProps) {
  const getStyle = (): React.CSSProperties => {
    if (active) return { background: '#EEF2FF', color: 'var(--color-primary)', borderRadius: 8 };
    if (variant === 'secondary') return { background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 8 };
    return { color: 'var(--color-text-secondary)', borderRadius: 8 };
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      title={shortcut ? `${label} (${shortcut})` : label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium transition-all"
      style={{ ...getStyle(), opacity: disabled || loading ? 0.4 : 1, cursor: disabled || loading ? 'not-allowed' : 'pointer' }}
      onMouseEnter={(e) => { if (!active && !disabled && !loading) { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; } }}
      onMouseLeave={(e) => { if (!active && !disabled && !loading) { (e.currentTarget as HTMLElement).style.background = variant === 'secondary' ? 'var(--color-surface)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = variant === 'secondary' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'; } }}>
      <Icon className={cn('w-4 h-4', loading && 'animate-spin')} />
      {!iconOnly && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

function MobileItem({ icon: Icon, label, active, disabled, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
      style={{ background: active ? '#EEF2FF' : 'transparent', color: active ? 'var(--color-primary)' : 'var(--color-text-primary)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}