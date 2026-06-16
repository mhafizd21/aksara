'use client';

import { useStudioStore } from '@/stores/studio.store';
import { Settings, Type, Calendar, PenLine, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_FAMILIES, DATE_FORMATS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { TextField, DateField } from '@/types';

export function PropertiesPanel() {
  const { selectedId, elements, updateElement, deleteElement } = useStudioStore();
  const selected = elements.find((e) => e.id === selectedId);

  if (!selectedId || !selected) {
    return (
      <aside className="w-64 border-l border-gray-100 bg-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Select an element to edit its properties
          </p>
        </div>
      </aside>
    );
  }

  const ElementIcon = selected.type === 'text' ? Type : selected.type === 'date' ? Calendar : PenLine;
  const elementLabel = selected.type === 'text' ? 'Text Field' : selected.type === 'date' ? 'Date Field' : 'Signature';

  return (
    <aside className="w-64 border-l border-gray-100 bg-white flex flex-col shrink-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ElementIcon className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-gray-700">{elementLabel}</p>
        </div>
        <button
          onClick={() => deleteElement(selected.id)}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Position & Size */}
        <Section title="Layout">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="X"
              value={Math.round(selected.position.x)}
              onChange={(v) => updateElement(selected.id, { position: { ...selected.position, x: v } })}
            />
            <NumberInput
              label="Y"
              value={Math.round(selected.position.y)}
              onChange={(v) => updateElement(selected.id, { position: { ...selected.position, y: v } })}
            />
            <NumberInput
              label="W"
              value={Math.round(selected.size.width)}
              min={40}
              onChange={(v) => updateElement(selected.id, { size: { ...selected.size, width: v } })}
            />
            <NumberInput
              label="H"
              value={Math.round(selected.size.height)}
              min={20}
              onChange={(v) => updateElement(selected.id, { size: { ...selected.size, height: v } })}
            />
          </div>
        </Section>

        {/* Text specific */}
        {(selected.type === 'text') && (
          <>
            <Section title="Content">
              <textarea
                value={(selected as TextField).content}
                onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </Section>
            <TextStyleSection element={selected as TextField} onChange={(u) => updateElement(selected.id, u)} />
          </>
        )}

        {/* Date specific */}
        {selected.type === 'date' && (
          <>
            <Section title="Format">
              <select
                value={(selected as DateField).format}
                onChange={(e) => {
                  const newContent = formatDate(new Date(), e.target.value);
                  updateElement(selected.id, { format: e.target.value, content: newContent });
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Section>
            <TextStyleSection element={selected as DateField} onChange={(u) => updateElement(selected.id, u)} />
          </>
        )}

        {/* Signature info */}
        {selected.type === 'signature' && (
          <Section title="Preview">
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.dataUrl}
                alt="Signature preview"
                className="w-full h-16 object-contain"
              />
            </div>
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function NumberInput({
  label, value, min, onChange,
}: {
  label: string; value: number; min?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
      <span className="text-xs text-gray-400 font-medium w-3">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 text-xs bg-transparent focus:outline-none text-gray-700"
      />
    </div>
  );
}

function TextStyleSection({
  element, onChange,
}: {
  element: TextField | DateField;
  onChange: (u: Partial<TextField | DateField>) => void;
}) {
  return (
    <Section title="Typography">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-12 shrink-0">Font</label>
          <select
            value={element.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-12 shrink-0">Size</label>
          <input
            type="number"
            value={element.fontSize}
            min={6}
            max={72}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className={cn(
              'flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-12 shrink-0">Color</label>
          <input
            type="color"
            value={element.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-8 h-7 rounded border border-gray-200 cursor-pointer"
          />
          <span className="text-xs text-gray-400">{element.color}</span>
        </div>
      </div>
    </Section>
  );
}
