'use client';

import { useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, RotateCcw, Check, Upload, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/stores/studio.store';
import type { SignatureMode } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any;

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', style: "'Dancing Script', cursive" },
  { name: 'Great Vibes', style: "'Great Vibes', cursive" },
  { name: 'Pacifico', style: "'Pacifico', cursive" },
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
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function SignatureModal() {
  const {
    isSignatureModalOpen, setSignatureModalOpen, signatureMode, setSignatureMode,
    readySignatureForPlacement,
  } = useStudioStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canvasRef = useRef<any>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setSignatureModalOpen(false);
    setTypedSignature('');
    setUploadedImage(null);
    setBgRemoved(false);
  }, [setSignatureModalOpen]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    setTypedSignature('');
    setUploadedImage(null);
    setBgRemoved(false);
  }, []);

  const getSignatureDataUrl = useCallback((): string | null => {
    if (signatureMode === 'draw') {
      if (!canvasRef.current || canvasRef.current.isEmpty()) return null;
      return canvasRef.current.toDataURL('image/png');
    }
    if (signatureMode === 'type') {
      if (!typedSignature.trim()) return null;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `60px ${selectedFont.style}`;
      ctx.fillStyle = '#1a1a2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature, 200, 60);
      return canvas.toDataURL('image/png');
    }
    if (signatureMode === 'upload') {
      return uploadedImage;
    }
    return null;
  }, [signatureMode, typedSignature, selectedFont, uploadedImage]);

  const handleApply = useCallback(async () => {
    const dataUrl = getSignatureDataUrl();
    if (!dataUrl) return;
    const natural = await measureImage(dataUrl);
    const { width, height } = fitSize(natural.width, natural.height, MAX_SIG_WIDTH, MAX_SIG_HEIGHT);
    readySignatureForPlacement(dataUrl, width, height);
    setTypedSignature('');
    setUploadedImage(null);
    setBgRemoved(false);
  }, [getSignatureDataUrl, readySignatureForPlacement]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setBgRemoved(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleRemoveBackground = useCallback(async () => {
    if (!uploadedImage) return;
    setRemovingBg(true);
    try {
      const result = await removeBackground(uploadedImage, 30);
      setUploadedImage(result);
      setBgRemoved(true);
    } finally {
      setRemovingBg(false);
    }
  }, [uploadedImage]);

  if (!isSignatureModalOpen) return null;

  const tabs: { id: SignatureMode; label: string }[] = [
    { id: 'draw', label: 'Draw' },
    { id: 'type', label: 'Type' },
    { id: 'upload', label: 'Upload' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Signature</h2>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setSignatureMode(tab.id); handleClear(); }}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                signatureMode === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {signatureMode === 'draw' && (
            <div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <SignatureCanvas
                  ref={canvasRef}
                  penColor="#1a1a2e"
                  canvasProps={{ width: 464, height: 200, className: 'w-full' }}
                  backgroundColor="transparent"
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">Draw your signature above</p>
            </div>
          )}

          {signatureMode === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Choose style</p>
                <div className="grid grid-cols-3 gap-2">
                  {SIGNATURE_FONTS.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => setSelectedFont(font)}
                      className={cn(
                        'px-3 py-3 border rounded-xl text-center transition-all',
                        selectedFont.name === font.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span style={{ fontFamily: font.style, fontSize: 20 }}>
                        {typedSignature || 'Sign'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {signatureMode === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploadedImage ? (
                <div className="space-y-3">
                  <div
                    className="border-2 border-gray-200 rounded-xl overflow-hidden h-48 flex items-center justify-center"
                    style={{
                      backgroundImage: bgRemoved
                        ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 0 0 / 16px 16px'
                        : undefined,
                      backgroundColor: bgRemoved ? undefined : '#f9fafb',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadedImage} alt="Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Change image
                    </button>
                    <button
                      onClick={handleRemoveBackground}
                      disabled={removingBg || bgRemoved}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium transition-all',
                        bgRemoved
                          ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                          : removingBg
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-wait'
                          : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100'
                      )}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      {bgRemoved ? 'Background removed' : removingBg ? 'Processing…' : 'Remove background'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                >
                  <Upload className="w-8 h-8 text-gray-300" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Click to upload</p>
                    <p className="text-xs text-gray-400">PNG, JPG, SVG</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}