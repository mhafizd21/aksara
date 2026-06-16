'use client';

import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useStudioStore } from '@/stores/studio.store';
import { MIN_SCALE, MAX_SCALE, SCALE_STEP, DEFAULT_SCALE } from '@/lib/constants';
import { clampValue } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function ZoomControls() {
  const { scale, setScale } = useStudioStore();

  const zoom = (delta: number) => {
    setScale(clampValue(Math.round((scale + delta) * 100) / 100, MIN_SCALE, MAX_SCALE));
  };

  const percent = Math.round(scale * 100);

  const presets = [50, 75, 100, 125, 150, 200];

  return (
    <footer className="h-11 bg-white border-t border-gray-100 flex items-center justify-center gap-1 px-4 shrink-0">
      <button
        onClick={() => zoom(-SCALE_STEP)}
        disabled={scale <= MIN_SCALE}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          scale <= MIN_SCALE ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'
        )}
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <div className="relative group">
        <button className="flex items-center gap-1 px-3 py-1 hover:bg-gray-50 rounded-lg transition-all min-w-[64px] justify-center">
          <span className="text-xs font-semibold text-gray-700">{percent}%</span>
        </button>
        {/* Preset dropdown */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden hidden group-hover:block z-50 min-w-[80px]">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setScale(p / 100)}
              className={cn(
                'w-full px-4 py-2 text-xs text-left hover:bg-gray-50 transition-colors font-medium',
                Math.round(scale * 100) === p ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => zoom(SCALE_STEP)}
        disabled={scale >= MAX_SCALE}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          scale >= MAX_SCALE ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'
        )}
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-100 mx-1" />

      <button
        onClick={() => setScale(DEFAULT_SCALE)}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500"
        title="Reset zoom"
      >
        <Maximize className="w-3.5 h-3.5" />
      </button>
    </footer>
  );
}
