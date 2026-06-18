'use client';

import { useState } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { Settings, Type, Calendar, PenLine, Trash2, ChevronRight, X } from 'lucide-react';
import { FONT_FAMILIES, DATE_FORMATS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { TextField, DateField } from '@/types';

export function PropertiesPanel() {
  const { selectedId, elements, updateElement, deleteElement } = useStudioStore();
  const selected = elements.find((e) => e.id === selectedId);
  const [open, setOpen] = useState(true);

  const ToggleBtn = (
    <button
      onClick={() => setOpen((v) => !v)}
      className="absolute -left-8 top-3 w-7 h-7 items-center justify-center rounded-l-lg transition-colors z-10 hidden sm:flex"
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRight: 'none',
        color: 'var(--color-text-secondary)',
      }}
      title={open ? 'Close properties' : 'Open properties'}
    >
      <ChevronRight
        className="w-3.5 h-3.5 transition-transform duration-200"
        style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
      />
    </button>
  );

  if (!open) {
    return (
      <aside
        className="relative shrink-0 hidden sm:flex flex-col"
        style={{ width: 32, borderLeft: '1px solid var(--color-border)', background: 'var(--color-background)' }}
      >
        {ToggleBtn}
        <div className="flex-1 flex items-center justify-center"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          <span className="label select-none"
            style={{ transform: 'rotate(180deg)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-disabled)' }}>
            Properties
          </span>
        </div>
      </aside>
    );
  }

  if (!selectedId || !selected) {
    return (
      <aside
        className="relative w-64 shrink-0 flex-col hidden sm:flex"
        style={{ borderLeft: '1px solid var(--color-border)', background: 'var(--color-background)' }}
      >
        {ToggleBtn}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="label">Properties</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-surface)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--color-border)' }} />
          </div>
          <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-disabled)' }}>
            Select an element to edit its properties
          </p>
        </div>
      </aside>
    );
  }

  const ElementIcon = selected.type === 'text' ? Type : selected.type === 'date' ? Calendar : PenLine;
  const elementLabel = selected.type === 'text' ? 'Text Field' : selected.type === 'date' ? 'Date Field' : 'Signature';

  return (
    <aside
      className="relative w-64 shrink-0 flex-col overflow-hidden hidden sm:flex"
      style={{ borderLeft: '1px solid var(--color-border)', background: 'var(--color-background)' }}
    >
      {ToggleBtn}

      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <ElementIcon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{elementLabel}</p>
        </div>
        <button
          onClick={() => deleteElement(selected.id)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          title="Delete element"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <Section title="Layout">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'X', value: Math.round(selected.position.x), onChange: (v: number) => updateElement(selected.id, { position: { ...selected.position, x: v } }) },
              { label: 'Y', value: Math.round(selected.position.y), onChange: (v: number) => updateElement(selected.id, { position: { ...selected.position, y: v } }) },
              { label: 'W', value: Math.round(selected.size.width), min: 40, onChange: (v: number) => updateElement(selected.id, { size: { ...selected.size, width: v } }) },
              { label: 'H', value: Math.round(selected.size.height), min: 20, onChange: (v: number) => updateElement(selected.id, { size: { ...selected.size, height: v } }) },
            ].map(({ label, value, min, onChange }) => (
              <NumberInput key={label} label={label} value={value} min={min} onChange={onChange} />
            ))}
          </div>
        </Section>

        {selected.type === 'text' && (
          <>
            <Section title="Content">
              <textarea value={(selected as TextField).content}
                onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                rows={3} className="input resize-none" style={{ fontSize: 12 }} />
            </Section>
            <TextStyleSection element={selected as TextField} onChange={(u) => updateElement(selected.id, u)} />
          </>
        )}

        {selected.type === 'date' && (
          <>
            <Section title="Format">
              <select value={(selected as DateField).format}
                onChange={(e) => updateElement(selected.id, { format: e.target.value, content: formatDate(new Date(), e.target.value) })}
                className="input" style={{ fontSize: 12 }}>
                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Section>
            <TextStyleSection element={selected as DateField} onChange={(u) => updateElement(selected.id, u)} />
          </>
        )}

        {selected.type === 'signature' && (
          <Section title="Preview">
            <div className="rounded-lg p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.dataUrl} alt="Signature preview" className="w-full h-14 object-contain" />
            </div>
          </Section>
        )}
      </div>
    </aside>
  );
}

export function MobilePropertiesSheet() {
  const { selectedId, elements, updateElement, deleteElement } = useStudioStore();
  const selected = elements.find((e) => e.id === selectedId);
  const [open, setOpen] = useState(false);

  if (!selectedId || !selected) return null;

  const ElementIcon = selected.type === 'text' ? Type : selected.type === 'date' ? Calendar : PenLine;
  const elementLabel = selected.type === 'text' ? 'Text Field' : selected.type === 'date' ? 'Date Field' : 'Signature';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-40 sm:hidden flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium"
        style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(67,56,202,0.4)' }}
      >
        <Settings className="w-4 h-4" />
        Properties
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--color-background)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', maxHeight: '70vh' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
            </div>
            <div className="flex items-center justify-between px-4 py-2"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <ElementIcon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{elementLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { deleteElement(selected.id); setOpen(false); }}
                  className="p-1.5 rounded-lg" style={{ color: 'var(--color-danger)', background: '#FEF2F2' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg"
                  style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-5" style={{ maxHeight: 'calc(70vh - 80px)' }}>
              <Section title="Layout">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'X', value: Math.round(selected.position.x), onChange: (v: number) => updateElement(selected.id, { position: { ...selected.position, x: v } }) },
                    { label: 'Y', value: Math.round(selected.position.y), onChange: (v: number) => updateElement(selected.id, { position: { ...selected.position, y: v } }) },
                    { label: 'W', value: Math.round(selected.size.width), min: 40, onChange: (v: number) => updateElement(selected.id, { size: { ...selected.size, width: v } }) },
                    { label: 'H', value: Math.round(selected.size.height), min: 20, onChange: (v: number) => updateElement(selected.id, { size: { ...selected.size, height: v } }) },
                  ].map(({ label, value, min, onChange }) => (
                    <NumberInput key={label} label={label} value={value} min={min} onChange={onChange} />
                  ))}
                </div>
              </Section>

              {selected.type === 'text' && (
                <>
                  <Section title="Content">
                    <textarea value={(selected as TextField).content}
                      onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                      rows={3} className="input resize-none" style={{ fontSize: 12 }} />
                  </Section>
                  <TextStyleSection element={selected as TextField} onChange={(u) => updateElement(selected.id, u)} />
                </>
              )}

              {selected.type === 'date' && (
                <>
                  <Section title="Format">
                    <select value={(selected as DateField).format}
                      onChange={(e) => updateElement(selected.id, { format: e.target.value, content: formatDate(new Date(), e.target.value) })}
                      className="input" style={{ fontSize: 12 }}>
                      {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Section>
                  <TextStyleSection element={selected as DateField} onChange={(u) => updateElement(selected.id, u)} />
                </>
              )}

              {selected.type === 'signature' && (
                <Section title="Preview">
                  <div className="rounded-lg p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected.dataUrl} alt="Signature preview" className="w-full h-14 object-contain" />
                  </div>
                </Section>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="label">{title}</p>
      {children}
    </div>
  );
}

function NumberInput({ label, value, min, onChange }: { label: string; value: number; min?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <span className="text-xs font-medium w-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <input type="number" value={value} min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 bg-transparent focus:outline-none text-xs"
        style={{ color: 'var(--color-text-primary)' }} />
    </div>
  );
}

function TextStyleSection({ element, onChange }: { element: TextField | DateField; onChange: (u: Partial<TextField | DateField>) => void }) {
  return (
    <Section title="Typography">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Font</label>
          <select value={element.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="input flex-1" style={{ fontSize: 12 }}>
            {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Size</label>
          <input type="number" value={element.fontSize} min={6} max={72}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="input flex-1" style={{ fontSize: 12 }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
          <input type="color" value={element.color} onChange={(e) => onChange({ color: e.target.value })}
            className="w-8 h-7 rounded cursor-pointer" style={{ border: '1px solid var(--color-border)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{element.color}</span>
        </div>
      </div>
    </Section>
  );
}