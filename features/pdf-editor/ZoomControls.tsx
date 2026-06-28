'use client';

import { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useStudioStore } from '@/stores/studio.store';
import { MIN_SCALE, MAX_SCALE, SCALE_STEP, DEFAULT_SCALE } from '@/lib/constants';
import { clampValue } from '@/lib/utils';

export function ZoomControls() {
  const { scale, setScale } = useStudioStore();
  const [presetOpen, setPresetOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoom = (delta: number) => {
    setScale(clampValue(Math.round((scale + delta) * 100) / 100, MIN_SCALE, MAX_SCALE));
  };

  const percent = Math.round(scale * 100);
  const presets = [50, 75, 100, 125, 150, 200];

  // Auto-collapse after 3s of inactivity
  const resetCollapseTimer = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setCollapsed(false);
    collapseTimer.current = setTimeout(() => setCollapsed(true), 3000);
  };

  const handleZoom = (delta: number) => {
    zoom(delta);
    resetCollapseTimer();
  };

  const iconBtn = (disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 6, borderRadius: 8, transition: 'background 0.15s', border: 'none',
    color: disabled ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer', background: 'transparent',
    minWidth: 32, minHeight: 32,
  });

  return (
    <>
      {/* ── DESKTOP footer zoom bar (hidden on mobile) ── */}
      <footer
        className="hidden md:flex h-11 items-center justify-center gap-1 px-4 shrink-0"
        style={{ background: 'var(--color-background)', borderTop: '1px solid var(--color-border)' }}
      >
        <button onClick={() => zoom(-SCALE_STEP)} disabled={scale <= MIN_SCALE}
          style={iconBtn(scale <= MIN_SCALE)} title="Zoom out (−)"
          onMouseEnter={(e) => { if (scale > MIN_SCALE) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="relative group">
          <button
            className="flex items-center gap-1 px-3 py-1 rounded-lg transition-all min-w-[56px] justify-center"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', background: 'transparent', minHeight: 32 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            {percent}%
          </button>
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 overflow-hidden hidden group-hover:block z-50 min-w-[80px]"
            style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-dropdown)', boxShadow: 'var(--shadow-md)' }}>
            {presets.map((p) => (
              <button key={p} onClick={() => setScale(p / 100)}
                className="w-full px-4 py-2 text-xs text-left transition-colors"
                style={{ fontWeight: percent === p ? 600 : 400, color: percent === p ? 'var(--color-primary)' : 'var(--color-text-primary)', background: percent === p ? '#EEF2FF' : 'transparent' }}
                onMouseEnter={(e) => { if (percent !== p) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
                onMouseLeave={(e) => { if (percent !== p) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                {p}%
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => zoom(SCALE_STEP)} disabled={scale >= MAX_SCALE}
          style={iconBtn(scale >= MAX_SCALE)} title="Zoom in (+)"
          onMouseEnter={(e) => { if (scale < MAX_SCALE) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: 'var(--color-border)' }} />

        <button onClick={() => setScale(DEFAULT_SCALE)} style={iconBtn(false)} title="Reset zoom"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </footer>

      {/* ── MOBILE zoom pill ──
          Centered horizontally above the bottom bar.
          Auto-collapses to just the percent badge after 3s idle.
          Tap the badge to re-expand or open preset picker.
      ── */}
      <div
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-40"
        style={{
          bottom: 'calc(124px + env(safe-area-inset-bottom))',
          pointerEvents: 'none',
        }}
      >
        <div
          className="flex items-center transition-all duration-300"
          style={{
            pointerEvents: 'auto',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 999,
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            opacity: collapsed ? 0.6 : 1,
            overflow: 'hidden',
          }}
        >
          {/* Zoom out — hidden when collapsed */}
          {!collapsed && (
            <button
              onClick={() => handleZoom(-SCALE_STEP)}
              disabled={scale <= MIN_SCALE}
              className="flex items-center justify-center active:scale-90 transition-all"
              style={{
                width: 40, height: 40,
                color: scale <= MIN_SCALE ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
                cursor: scale <= MIN_SCALE ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          )}

          {/* Percent badge — always visible, tap to expand or open presets */}
          <div className="relative">
            <button
              onClick={() => {
                if (collapsed) {
                  resetCollapseTimer();
                } else {
                  setPresetOpen((v) => !v);
                  resetCollapseTimer();
                }
              }}
              className="flex items-center justify-center active:scale-95 transition-all"
              style={{
                minWidth: collapsed ? 52 : 44, height: 40,
                paddingLeft: collapsed ? 14 : 0,
                paddingRight: collapsed ? 14 : 0,
                fontSize: 12, fontWeight: 700,
                color: 'var(--color-text-primary)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {percent}%
            </button>

            {/* Preset picker — pops up above */}
            {presetOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPresetOpen(false)} />
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 overflow-hidden rounded-xl"
                  style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                    minWidth: 80,
                  }}
                >
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setScale(p / 100); setPresetOpen(false); setCollapsed(false); }}
                      className="w-full px-4 active:scale-95"
                      style={{
                        height: 44, fontSize: 13,
                        fontWeight: percent === p ? 700 : 400,
                        color: percent === p ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        background: percent === p ? '#EEF2FF' : 'transparent',
                        textAlign: 'center',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {p}%
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => { setScale(DEFAULT_SCALE); setPresetOpen(false); setCollapsed(false); }}
                      className="w-full px-4 flex items-center justify-center gap-1.5"
                      style={{
                        height: 44, fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Maximize className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Zoom in — hidden when collapsed */}
          {!collapsed && (
            <button
              onClick={() => handleZoom(SCALE_STEP)}
              disabled={scale >= MAX_SCALE}
              className="flex items-center justify-center active:scale-90 transition-all"
              style={{
                width: 40, height: 40,
                color: scale >= MAX_SCALE ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
                cursor: scale >= MAX_SCALE ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}