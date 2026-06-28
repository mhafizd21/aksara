'use client';

import { useRef, useCallback, useState } from 'react';
import {
  Upload, Type, Calendar, PenLine, Undo2, Redo2,
  Download, Loader2, ChevronLeft, ChevronRight, X,
  FileEdit, Check, Circle, Star, Shapes, Square, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/stores/studio.store';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { usePdfExport } from '@/hooks/usePdfExport';
import { SYMBOL_SHAPES, SYMBOL_SHAPE_DEFAULTS, SYMBOL_PRESET_COLORS } from '@/lib/constants';
import type { SymbolShape } from '@/types';
import Image from 'next/image';

export function Toolbar() {
  const {
    document: pdfDoc, setDocument, activeToolMode, setActiveToolMode,
    undo, redo, history, historyIndex,
    isExporting, setSignatureModalOpen, currentPage, setCurrentPage,
    pendingSignatureDataUrl, cancelSignaturePlacement,
    downloadFileName, setDownloadFileName,
    selectedSymbolShape, selectedSymbolStrokeColor, setSelectedSymbolShape, setSelectedSymbolStrokeColor,
  } = useStudioStore();

  const { loading, error, loadPdf } = usePdfLoader();
  const { exportPdf } = usePdfExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFileName, setEditingFileName] = useState(false);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [mobileSymbolPickerOpen, setMobileSymbolPickerOpen] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const doc = await loadPdf(file);
    if (doc) setDocument(doc);
    e.target.value = '';
  }, [loadPdf, setDocument]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isPlacing = activeToolMode === 'signature' && !!pendingSignatureDataUrl;

  const tools = [
    { id: 'text' as const, icon: Type, label: 'Teks', shortcut: 'T' },
    { id: 'date' as const, icon: Calendar, label: 'Tanggal', shortcut: 'D' },
    { id: 'signature' as const, icon: PenLine, label: 'Tanda Tangan', shortcut: 'S' },
  ];

  const SYMBOL_ICONS: Record<SymbolShape, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    check: Check, cross: X, circle: Circle, star: Star, rectangle: Square, line: Minus,
  };

  const pickSymbol = (shape: SymbolShape) => {
    setSelectedSymbolShape(shape);
    setActiveToolMode('symbol');
    setSymbolPickerOpen(false);
    setMobileSymbolPickerOpen(false);
  };

  const handleToolClick = (id: 'text' | 'date' | 'signature') => {
    if (id === 'signature') { setSignatureModalOpen(true); }
    else { setActiveToolMode(activeToolMode === id ? 'select' : id); }
  };

  return (
    <>
      {/* ── TOP HEADER ── */}
      <header
        className="h-14 flex items-center px-4 gap-2 shrink-0 z-40"
        style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-3 shrink-0">
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

        {/* Placement banner */}
        {isPlacing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg ml-1"
            style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
            <span className="text-xs font-medium hidden sm:block" style={{ color: 'var(--color-primary)' }}>
              Ketuk PDF untuk menempatkan tanda tangan
            </span>
            <span className="text-xs font-medium sm:hidden" style={{ color: 'var(--color-primary)' }}>
              Ketuk untuk menempatkan
            </span>
            <button onClick={cancelSignaturePlacement} className="p-0.5 rounded hover:bg-indigo-100 transition-colors">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
            </button>
          </div>
        )}

        {/* Desktop tools */}
        {!isPlacing && (
          <div className="hidden md:flex items-center gap-1 relative">
            <div className="w-px h-5 shrink-0" style={{ background: 'var(--color-border)' }} />
            {tools.map((tool) => (
              <ToolBtn key={tool.id} icon={tool.icon} label={tool.label} shortcut={tool.shortcut}
                active={activeToolMode === tool.id} disabled={!pdfDoc}
                onClick={() => handleToolClick(tool.id)} />
            ))}
            <ToolBtn icon={Shapes} label="Simbol" shortcut="K" disabled={!pdfDoc}
              active={activeToolMode === 'symbol'}
              onClick={() => setSymbolPickerOpen((v) => !v)} />

            {symbolPickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSymbolPickerOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-50 p-3 rounded-xl"
                  style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', width: 220 }}
                  onClick={(e) => e.stopPropagation()}>
                  <p className="label mb-2">Bentuk simbol</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {SYMBOL_SHAPES.map((shape) => {
                      const Icon = SYMBOL_ICONS[shape];
                      return (
                        <button key={shape} onClick={() => pickSymbol(shape)}
                          title={shape}
                          className="flex items-center justify-center h-9 rounded-lg transition-colors"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}>
                          <Icon className="w-4 h-4" style={{ color: SYMBOL_SHAPE_DEFAULTS[shape].strokeColor }} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="label mb-2">Warna</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SYMBOL_PRESET_COLORS.filter((c) => c !== 'transparent').map((c) => (
                      <button key={c} onClick={() => setSelectedSymbolStrokeColor(c)}
                        className="w-6 h-6 rounded-full shrink-0"
                        style={{ background: c, border: selectedSymbolStrokeColor === c ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }} />
                    ))}
                    <input type="color" value={selectedSymbolStrokeColor}
                      onChange={(e) => setSelectedSymbolStrokeColor(e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer shrink-0" />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Atur fill, gaya &amp; ketebalan dari panel Properti setelah menempatkan.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Desktop Undo/Redo */}
        <div className="hidden md:flex items-center gap-1">
          <div className="w-px h-5 shrink-0 ml-1" style={{ background: 'var(--color-border)' }} />
          <ToolBtn icon={Undo2} label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={undo} iconOnly />
          <ToolBtn icon={Redo2} label="Redo" shortcut="⌘Y" disabled={!canRedo} onClick={redo} iconOnly />
        </div>

        {/* Desktop Page nav */}
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

        {/* Desktop filename editor */}
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
                title="Klik untuk rename"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <FileEdit className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{downloadFileName || pdfDoc.file.name}.pdf</span>
              </button>
            )}
          </div>
        )}

        <div className="w-px h-5 shrink-0 hidden sm:block" style={{ background: 'var(--color-border)' }} />

        {/* Download button */}
        <button onClick={exportPdf} disabled={!pdfDoc || isExporting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0"
          style={!pdfDoc || isExporting
            ? { background: 'var(--color-surface)', color: 'var(--color-text-disabled)', cursor: 'not-allowed', border: '1px solid var(--color-border)' }
            : { background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
          onMouseEnter={(e) => { if (pdfDoc && !isExporting) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)'; }}
          onMouseLeave={(e) => { if (pdfDoc && !isExporting) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'; }}>
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">{isExporting ? 'Menyimpan…' : 'Unduh'}</span>
        </button>
      </header>

      {/* ── MOBILE BOTTOM ACTION BAR ── only on mobile (md:hidden) */}
      <MobileBottomBar
        pdfDoc={pdfDoc}
        isPlacing={isPlacing}
        activeToolMode={activeToolMode}
        canUndo={canUndo}
        canRedo={canRedo}
        currentPage={currentPage}
        isExporting={isExporting}
        loading={loading}
        selectedSymbolShape={selectedSymbolShape}
        selectedSymbolStrokeColor={selectedSymbolStrokeColor}
        mobileSymbolPickerOpen={mobileSymbolPickerOpen}
        SYMBOL_ICONS={SYMBOL_ICONS}
        onUpload={() => fileInputRef.current?.click()}
        onToolClick={handleToolClick}
        onPickSymbol={pickSymbol}
        onToggleSymbolPicker={() => setMobileSymbolPickerOpen((v) => !v)}
        onCloseSymbolPicker={() => setMobileSymbolPickerOpen(false)}
        onSetStrokeColor={setSelectedSymbolStrokeColor}
        onUndo={undo}
        onRedo={redo}
        onPrevPage={() => setCurrentPage(currentPage - 1)}
        onNextPage={() => setCurrentPage(currentPage + 1)}
        onExport={exportPdf}
        onCancelPlacement={cancelSignaturePlacement}
      />
    </>
  );
}

/* ─────────────────────────────────────────────
   MOBILE BOTTOM ACTION BAR
   Fixed bottom bar with thumb-friendly big tap targets.
   Layout (5 slots):
     Upload | Teks | Tanda Tangan | Simbol | Unduh
   + secondary row for Undo/Redo/PageNav when PDF loaded
───────────────────────────────────────────── */
interface MobileBottomBarProps {
  pdfDoc: import('@/types').PdfDocument | null;
  isPlacing: boolean;
  activeToolMode: string;
  canUndo: boolean;
  canRedo: boolean;
  currentPage: number;
  isExporting: boolean;
  loading: boolean;
  selectedSymbolShape: SymbolShape;
  selectedSymbolStrokeColor: string;
  mobileSymbolPickerOpen: boolean;
  SYMBOL_ICONS: Record<SymbolShape, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  onUpload: () => void;
  onToolClick: (id: 'text' | 'date' | 'signature') => void;
  onPickSymbol: (shape: SymbolShape) => void;
  onToggleSymbolPicker: () => void;
  onCloseSymbolPicker: () => void;
  onSetStrokeColor: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onExport: () => void;
  onCancelPlacement: () => void;
}

function MobileBottomBar({
  pdfDoc, isPlacing, activeToolMode, canUndo, canRedo,
  currentPage, isExporting, loading, selectedSymbolShape,
  selectedSymbolStrokeColor, mobileSymbolPickerOpen, SYMBOL_ICONS,
  onUpload, onToolClick, onPickSymbol, onToggleSymbolPicker,
  onCloseSymbolPicker, onSetStrokeColor, onUndo, onRedo,
  onPrevPage, onNextPage, onExport, onCancelPlacement,
}: MobileBottomBarProps) {

  const UploadIcon = loading ? Loader2 : Upload;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col"
      style={{
        background: 'var(--color-background)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Signature placement banner */}
      {isPlacing && (
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ background: '#EEF2FF', borderBottom: '1px solid #C7D2FE' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            Ketuk PDF untuk menempatkan tanda tangan
          </span>
          <button
            onClick={onCancelPlacement}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: '#C7D2FE', color: 'var(--color-primary)' }}>
            <X className="w-3 h-3" />
            Batal
          </button>
        </div>
      )}

      {/* Symbol picker sheet */}
      {mobileSymbolPickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseSymbolPicker} />
          <div className="relative z-50 px-4 pt-3 pb-2"
            style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Pilih Simbol</p>
              <button onClick={onCloseSymbolPicker} className="p-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {SYMBOL_SHAPES.map((shape) => {
                const Icon = SYMBOL_ICONS[shape];
                const active = activeToolMode === 'symbol' && selectedSymbolShape === shape;
                return (
                  <button key={shape} onClick={() => onPickSymbol(shape)}
                    className="flex flex-col items-center justify-center h-14 rounded-xl gap-1"
                    style={{
                      background: active ? '#EEF2FF' : 'var(--color-background)',
                      border: active ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}>
                    <Icon className="w-5 h-5" style={{ color: SYMBOL_SHAPE_DEFAULTS[shape].strokeColor }} />
                    <span className="text-[9px] font-medium capitalize" style={{ color: 'var(--color-text-secondary)' }}>{shape}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {SYMBOL_PRESET_COLORS.filter((c) => c !== 'transparent').map((c) => (
                <button key={c} onClick={() => onSetStrokeColor(c)}
                  className="w-7 h-7 rounded-full shrink-0"
                  style={{ background: c, border: selectedSymbolStrokeColor === c ? '2.5px solid var(--color-primary)' : '1px solid var(--color-border)' }} />
              ))}
              <input type="color" value={selectedSymbolStrokeColor}
                onChange={(e) => onSetStrokeColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer shrink-0" />
            </div>
          </div>
        </>
      )}

      {/* Secondary row: Undo / Page nav / Redo — only when PDF loaded */}
      {pdfDoc && !isPlacing && (
        <div className="flex items-center justify-between px-4 py-1.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <MiniBtn icon={Undo2} label="Undo" disabled={!canUndo} onClick={onUndo} />
            <MiniBtn icon={Redo2} label="Redo" disabled={!canRedo} onClick={onRedo} />
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
            </button>
            <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-text-primary)', minWidth: 48, textAlign: 'center' }}>
              {currentPage + 1} / {pdfDoc.numPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={currentPage === pdfDoc.numPages - 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
            </button>
          </div>

          {/* Placeholder to balance flex */}
          <div style={{ width: 72 }} />
        </div>
      )}

      {/* Primary action row */}
      <div className="flex items-center justify-around px-2 py-1">
        {/* Upload */}
        <BottomAction
          icon={UploadIcon}
          label="Upload"
          onClick={onUpload}
          loading={loading}
        />

        {/* Text */}
        <BottomAction
          icon={Type}
          label="Teks"
          onClick={() => onToolClick('text')}
          active={activeToolMode === 'text'}
          disabled={!pdfDoc}
        />

        {/* Signature — primary CTA, larger */}
        <BottomAction
          icon={PenLine}
          label="Tanda Tangan"
          onClick={() => onToolClick('signature')}
          active={activeToolMode === 'signature'}
          disabled={!pdfDoc}
          isPrimary
        />

        {/* Date */}
        <BottomAction
          icon={Calendar}
          label="Tanggal"
          onClick={() => onToolClick('date')}
          active={activeToolMode === 'date'}
          disabled={!pdfDoc}
        />

        {/* Symbol */}
        <BottomAction
          icon={Shapes}
          label="Simbol"
          onClick={onToggleSymbolPicker}
          active={activeToolMode === 'symbol' || mobileSymbolPickerOpen}
          disabled={!pdfDoc}
        />

        {/* Download */}
        <BottomAction
          icon={isExporting ? Loader2 : Download}
          label={isExporting ? 'Menyimpan…' : 'Unduh'}
          onClick={onExport}
          disabled={!pdfDoc || isExporting}
          loading={isExporting}
          isDownload
        />
      </div>
    </div>
  );
}

/* ─── BottomAction: big thumb-friendly tap target ─── */
interface BottomActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  isPrimary?: boolean;
  isDownload?: boolean;
}

function BottomAction({ icon: Icon, label, onClick, active, disabled, loading, isPrimary, isDownload }: BottomActionProps) {
  const getStyle = (): React.CSSProperties => {
    if (isPrimary) {
      return {
        background: active ? 'var(--color-primary-hover)' : 'var(--color-primary)',
        color: '#fff',
        borderRadius: 16,
        width: 56,
        height: 56,
        boxShadow: '0 4px 16px rgba(67,56,202,0.35)',
        marginTop: -8,
      };
    }
    if (isDownload) {
      return {
        background: disabled ? 'var(--color-surface)' : '#EEF2FF',
        color: disabled ? 'var(--color-text-disabled)' : 'var(--color-primary)',
        borderRadius: 12,
      };
    }
    if (active) {
      return {
        background: '#EEF2FF',
        color: 'var(--color-primary)',
        borderRadius: 12,
      };
    }
    return {
      background: 'transparent',
      color: disabled ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
      borderRadius: 12,
    };
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 px-1 transition-all active:scale-95',
        isPrimary && 'shadow-lg',
      )}
      style={{
        ...getStyle(),
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon className={cn('w-5 h-5', isPrimary && 'w-6 h-6', loading && 'animate-spin')} />
      {!isPrimary && (
        <span className="text-[9px] font-medium leading-none text-center" style={{ lineHeight: 1.2 }}>
          {label}
        </span>
      )}
    </button>
  );
}

/* ─── MiniBtn: compact secondary action ─── */
function MiniBtn({ icon: Icon, label, disabled, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string;
  disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
      style={{
        background: 'var(--color-surface)',
        color: disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

/* ─── Desktop ToolBtn (unchanged) ─── */
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