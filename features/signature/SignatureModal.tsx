'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { X, RotateCcw, Check, Upload, Wand2 } from 'lucide-react';
import { useStudioStore } from '@/stores/studio.store';
import type { SignatureMode } from '@/types';

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', style: "'Dancing Script', cursive" },
  { name: 'Great Vibes', style: "'Great Vibes', cursive" },
  { name: 'Pacifico', style: "'Pacifico', cursive" },
];

const PRESET_COLORS = [
  { label: 'Black', value: '#0F172A' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Red', value: '#DC2626' },
];

const MAX_SIG_WIDTH = 300;
const MAX_SIG_HEIGHT = 150;

function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: MAX_SIG_WIDTH, height: MAX_SIG_HEIGHT });
    img.src = dataUrl;
  });
}

function fitSize(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function removeBackground(dataUrl: string, tolerance = 30): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function recolorSignature(dataUrl: string, hexColor: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const tr = parseInt(hexColor.slice(1, 3), 16);
      const tg = parseInt(hexColor.slice(3, 5), 16);
      const tb = parseInt(hexColor.slice(5, 7), 16);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 10) { data[i] = tr; data[i + 1] = tg; data[i + 2] = tb; }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface Point { x: number; y: number; t: number; }

interface DrawCanvasProps {
  color: string;
  onDrawn: (isEmpty: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function DrawCanvas({ color, onDrawn, canvasRef }: DrawCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const points = useRef<Point[]>([]);
  const initializedRef = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = wrapper.clientWidth || wrapper.getBoundingClientRect().width || 320;
    const cssH = 200;

    if (
      initializedRef.current &&
      canvas.width === Math.floor(cssW * dpr) &&
      canvas.height === Math.floor(cssH * dpr)
    ) return;

    let imageData: ImageData | null = null;
    const ctx0 = canvas.getContext('2d');
    if (ctx0 && initializedRef.current && canvas.width > 0 && canvas.height > 0) {
      try { imageData = ctx0.getImageData(0, 0, canvas.width, canvas.height); } catch { /* ignore */ }
    }

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (imageData) {
      const tmp = document.createElement('canvas');
      tmp.width = imageData.width; tmp.height = imageData.height;
      tmp.getContext('2d')!.putImageData(imageData, 0, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    initializedRef.current = true;
  }, [canvasRef, color]);

  // Init on mount — rAF + 150ms fallback for slow mobile renders
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      initCanvas();
      setTimeout(initCanvas, 150);
    });
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update color without clearing
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.strokeStyle = color; ctx.fillStyle = color; }
  }, [color, canvasRef]);

  // Handle orientation change
  useEffect(() => {
    const onResize = () => initCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [initCanvas]);

  const getPos = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const drawSmooth = useCallback((pts: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas || pts.length < 2) return;
    const ctx = canvas.getContext('2d')!;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;

    const n = pts.length;

    if (n === 2) {
      const dt = Math.max(pts[1].t - pts[0].t, 1);
      const speed = Math.sqrt((pts[1].x - pts[0].x) ** 2 + (pts[1].y - pts[0].y) ** 2) / dt;
      ctx.lineWidth = Math.max(1.5, Math.min(3.5, 3.5 - speed * 0.01));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
      return;
    }

    const p0 = pts[Math.max(0, n - 4)];
    const p1 = pts[Math.max(0, n - 3)];
    const p2 = pts[n - 2];
    const p3 = pts[n - 1];

    const dt = Math.max(p3.t - p1.t, 1);
    const dist = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2);
    const speed = dist / dt;
    ctx.lineWidth = Math.max(1.5, Math.min(3.5, 3.5 - speed * 0.008));

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    ctx.stroke();
  }, [color, canvasRef]);

  const beginStroke = useCallback((clientX: number, clientY: number) => {
    isDrawing.current = true;
    points.current = [];
    const pos = getPos(clientX, clientY);
    points.current.push({ ...pos, t: Date.now() });
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    onDrawn(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, onDrawn]);

  const continueStroke = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const pos = getPos(clientX, clientY);
    const last = points.current[points.current.length - 1];
    if (!last) return;
    const d = Math.sqrt((pos.x - last.x) ** 2 + (pos.y - last.y) ** 2);
    if (d < 1) return;
    points.current.push({ ...pos, t: Date.now() });
    drawSmooth(points.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawSmooth]);

  const endStroke = useCallback(() => {
    isDrawing.current = false;
    points.current = [];
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    beginStroke(e.clientX, e.clientY);
  }, [beginStroke]);

  // Touch: attach directly with passive:false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length !== 1) return;
      beginStroke(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length !== 1) return;
      continueStroke(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endStroke();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [canvasRef, beginStroke, continueStroke, endStroke]);

  // Mouse move/up on window
  useEffect(() => {
    const onMove = (e: MouseEvent) => continueStroke(e.clientX, e.clientY);
    const onUp = () => endStroke();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [continueStroke, endStroke]);

  return (
    <div ref={wrapperRef} className="w-full" style={{ touchAction: 'none', userSelect: 'none' }}>
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'crosshair', display: 'block', width: '100%', touchAction: 'none' }}
      />
    </div>
  );
}

export function SignatureModal() {
  const { isSignatureModalOpen, setSignatureModalOpen, signatureMode, setSignatureMode, readySignatureForPlacement } = useStudioStore();

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);
  const [customColor, setCustomColor] = useState('#0F172A');
  const [isCustom, setIsCustom] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const activeColor = isCustom ? customColor : selectedColor;

  const handleClose = useCallback(() => {
    setSignatureModalOpen(false);
    setTypedSignature(''); setUploadedImage(null); setBgRemoved(false); setIsEmpty(true);
  }, [setSignatureModalOpen]);

  const handleClear = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d')!;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    setTypedSignature(''); setUploadedImage(null); setBgRemoved(false); setIsEmpty(true);
  }, []);

  const getSignatureDataUrl = useCallback(async (): Promise<string | null> => {
    if (signatureMode === 'draw') {
      if (!drawCanvasRef.current || isEmpty) return null;
      return recolorSignature(drawCanvasRef.current.toDataURL('image/png'), activeColor);
    }
    if (signatureMode === 'type') {
      if (!typedSignature.trim()) return null;
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 120;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 400, 120);
      ctx.font = `60px ${selectedFont.style}`;
      ctx.fillStyle = activeColor;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature, 200, 60);
      return canvas.toDataURL('image/png');
    }
    return uploadedImage;
  }, [signatureMode, typedSignature, selectedFont, uploadedImage, activeColor, isEmpty]);

  const handleApply = useCallback(async () => {
    const dataUrl = await getSignatureDataUrl();
    if (!dataUrl) return;
    const natural = await measureImage(dataUrl);
    const { width, height } = fitSize(natural.width, natural.height, MAX_SIG_WIDTH, MAX_SIG_HEIGHT);
    readySignatureForPlacement(dataUrl, width, height);
    setTypedSignature(''); setUploadedImage(null); setBgRemoved(false); setIsEmpty(true);
  }, [getSignatureDataUrl, readySignatureForPlacement]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setUploadedImage(ev.target?.result as string); setBgRemoved(false); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleRemoveBg = useCallback(async () => {
    if (!uploadedImage) return;
    setRemovingBg(true);
    try { const r = await removeBackground(uploadedImage, 30); setUploadedImage(r); setBgRemoved(true); }
    finally { setRemovingBg(false); }
  }, [uploadedImage]);

  if (!isSignatureModalOpen) return null;

  const tabs: { id: SignatureMode; label: string }[] = [
    { id: 'draw', label: 'Draw' },
    { id: 'type', label: 'Type' },
    { id: 'upload', label: 'Upload' },
  ];

  const showColorPicker = signatureMode === 'draw' || signatureMode === 'type';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={handleClose} />

      <div className="relative w-full sm:max-w-lg sm:mx-4 overflow-hidden"
        style={{
          background: 'var(--color-background)',
          borderRadius: '16px 16px 0 0',
          border: '1px solid var(--color-border)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}>

        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create Signature</h2>
            <p className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--color-text-secondary)' }}>Draw, type, or upload</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 sm:px-6 pt-3 gap-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setSignatureMode(tab.id); handleClear(); }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{ background: signatureMode === tab.id ? '#EEF2FF' : 'transparent', color: signatureMode === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-4">
          {showColorPicker && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Color</span>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c.value} onClick={() => { setSelectedColor(c.value); setIsCustom(false); }} title={c.label}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ backgroundColor: c.value, outline: !isCustom && selectedColor === c.value ? '2px solid var(--color-primary)' : '2px solid transparent', outlineOffset: 2, transform: !isCustom && selectedColor === c.value ? 'scale(1.15)' : 'scale(1)' }} />
                ))}
                <div className="relative">
                  <button onClick={() => colorInputRef.current?.click()} title="Custom color"
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', outline: isCustom ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', outlineOffset: 2, transform: isCustom ? 'scale(1.15)' : 'scale(1)' }} />
                  <input ref={colorInputRef} type="color" value={customColor}
                    onChange={(e) => { setCustomColor(e.target.value); setIsCustom(true); }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                </div>
                {isCustom && <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{customColor}</span>}
              </div>
            </div>
          )}

          {signatureMode === 'draw' && (
            <div>
              <div className="overflow-hidden relative"
                style={{ border: '1.5px dashed var(--color-border)', borderRadius: 12, background: '#fff' }}>
                <DrawCanvas color={activeColor} onDrawn={(empty) => setIsEmpty(empty)} canvasRef={drawCanvasRef} />
                {isEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <span className="text-sm" style={{ color: 'var(--color-text-disabled)' }}>Sign here</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-disabled)' }}>Draw your signature above</p>
            </div>
          )}

          {signatureMode === 'type' && (
            <div className="space-y-3">
              <input type="text" value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your name" className="input" style={{ fontSize: 16 }} />
              <div className="space-y-2">
                <p className="label">Choose style</p>
                <div className="grid grid-cols-3 gap-2">
                  {SIGNATURE_FONTS.map((font) => (
                    <button key={font.name} onClick={() => setSelectedFont(font)}
                      className="px-2 py-3 rounded-xl text-center transition-all"
                      style={{ border: `1.5px solid ${selectedFont.name === font.name ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedFont.name === font.name ? '#EEF2FF' : 'transparent' }}>
                      <span style={{ fontFamily: font.style, fontSize: 18, color: activeColor }}>{typedSignature || 'Sign'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {signatureMode === 'upload' && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              {uploadedImage ? (
                <div className="space-y-3">
                  <div className="h-40 flex items-center justify-center overflow-hidden"
                    style={{ borderRadius: 12, border: '1.5px solid var(--color-border)', backgroundImage: bgRemoved ? 'repeating-conic-gradient(#E2E8F0 0% 25%, #F8FAFC 0% 50%) 0 0 / 16px 16px' : undefined, background: bgRemoved ? undefined : 'var(--color-surface)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadedImage} alt="Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      Change
                    </button>
                    <button onClick={handleRemoveBg} disabled={removingBg || bgRemoved}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all"
                      style={bgRemoved
                        ? { background: '#F0FDF4', color: 'var(--color-success)', border: '1px solid #BBF7D0' }
                        : removingBg
                        ? { background: 'var(--color-surface)', color: 'var(--color-text-disabled)', border: '1px solid var(--color-border)' }
                        : { background: '#FAF5FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                      <Wand2 className="w-4 h-4" />
                      {bgRemoved ? 'Removed' : removingBg ? 'Processing…' : 'Remove bg'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 flex flex-col items-center justify-center gap-3 transition-all"
                  style={{ border: '1.5px dashed var(--color-border)', borderRadius: 12, background: 'var(--color-surface)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}>
                  <Upload className="w-7 h-7" style={{ color: 'var(--color-text-disabled)' }} />
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Tap to upload</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>PNG, JPG, SVG</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <button onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-border)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
          <div className="flex gap-2">
            <button onClick={handleClose}
              className="px-4 py-2.5 text-sm font-medium rounded-lg transition-all hidden sm:block"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-border)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              Cancel
            </button>
            <button onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'; }}>
              <Check className="w-3.5 h-3.5" /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}