'use client';

import { useState } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { Settings, Type, Calendar, PenLine, Trash2, ChevronLeft, ChevronRight, X, Layers, Shapes } from 'lucide-react';
import { FONT_FAMILIES, DATE_FORMATS, SYMBOL_SHAPES, SYMBOL_PRESET_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { TextField, DateField, SymbolElement, PdfElement } from '@/types';

// Compute the axis-aligned bounding box center of an element after rotation.
// CSS rotates around the element's own center, so the visual center == the unrotated center.
// AABB edges change, but the center stays at (cx, cy).
function getCenter(el: PdfElement) {
  return {
    cx: el.position.x + el.size.width / 2,
    cy: el.position.y + el.size.height / 2,
  };
}

// Compute the full AABB of a rotated element (for left/right/top/bottom alignment).
function getAABB(el: PdfElement) {
  const rot = ((el.rotation ?? 0) * Math.PI) / 180;
  const hw = el.size.width / 2;
  const hh = el.size.height / 2;
  const cos = Math.abs(Math.cos(rot));
  const sin = Math.abs(Math.sin(rot));
  const aabbW = hw * cos + hh * sin;
  const aabbH = hw * sin + hh * cos;
  const { cx, cy } = getCenter(el);
  return { left: cx - aabbW, right: cx + aabbW, top: cy - aabbH, bottom: cy + aabbH, cx, cy };
}

export function PropertiesPanel() {
  const { selectedId, selectedIds, elements, updateElement, updateSelectedElements, deleteElement, deleteSelectedElements } = useStudioStore();
  const selected = elements.find((e) => e.id === selectedId);
  const [open, setOpen] = useState(true);
  const isMultiSelect = selectedIds.length > 1;

  return (
    <div className="hidden sm:flex shrink-0 relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Hide properties' : 'Show properties'}
        className="absolute top-4 -left-7 z-20 flex items-center justify-center w-7 h-7 rounded-l-lg"
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRight: 'none',
          color: 'var(--color-text-secondary)',
          boxShadow: '-2px 0 6px rgba(0,0,0,0.04)',
        }}
      >
        {open ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <aside className="w-64 flex flex-col overflow-hidden"
          style={{ borderLeft: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
          {isMultiSelect ? (
            <MultiSelectPanel selectedIds={selectedIds} elements={elements}
              updateSelectedElements={updateSelectedElements} deleteSelectedElements={deleteSelectedElements} />
          ) : !selectedId || !selected ? (
            <>
              <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="label">Properties</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                  <Settings className="w-5 h-5" style={{ color: 'var(--color-border)' }} />
                </div>
                <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-disabled)' }}>
                  Select an element to edit its properties
                </p>
              </div>
            </>
          ) : (
            <PanelContent selected={selected} updateElement={updateElement} deleteElement={deleteElement} />
          )}
        </aside>
      )}

      {!open && (
        <div className="w-8 flex flex-col items-center justify-center"
          style={{ borderLeft: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
          <span className="label select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-disabled)' }}>
            Properties
          </span>
        </div>
      )}
    </div>
  );
}

function MultiSelectPanel({
  selectedIds, elements, updateSelectedElements, deleteSelectedElements,
}: {
  selectedIds: string[];
  elements: PdfElement[];
  updateSelectedElements: ReturnType<typeof useStudioStore.getState>['updateSelectedElements'];
  deleteSelectedElements: ReturnType<typeof useStudioStore.getState>['deleteSelectedElements'];
}) {
  const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
  const textLikeElements = selectedElements.filter((e) => e.type === 'text' || e.type === 'date') as (TextField | DateField)[];
  const hasTextLike = textLikeElements.length > 0;
  const firstText = textLikeElements[0];
  const sharedFontFamily = textLikeElements.every((e) => e.fontFamily === firstText?.fontFamily) ? firstText?.fontFamily : '';
  const sharedFontSize = textLikeElements.every((e) => e.fontSize === firstText?.fontSize) ? firstText?.fontSize : undefined;
  const sharedColor = textLikeElements.every((e) => e.color === firstText?.color) ? firstText?.color : '#000000';

  return (
    <>
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {selectedIds.length} Elements
          </p>
        </div>
        <button onClick={deleteSelectedElements} className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }} title="Delete all selected"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <Section title="Selection">
          <div className="space-y-1">
            {selectedElements.map((el) => {
              const Icon = el.type === 'text' ? Type : el.type === 'date' ? Calendar : PenLine;
              const label = el.type === 'text' ? 'Text' : el.type === 'date' ? 'Date' : 'Signature';
              const preview = (el.type === 'text' || el.type === 'date') ? el.content : 'Signature';
              return (
                <div key={el.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--color-surface)' }}>
                  <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{label}: {preview}</span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Align">
          <AlignmentControls selectedIds={selectedIds} elements={elements} />
        </Section>

        {hasTextLike && (
          <Section title={`Typography (${textLikeElements.length} of ${selectedIds.length})`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Font</label>
                <select value={sharedFontFamily}
                  onChange={(e) => updateSelectedElements({ fontFamily: e.target.value } as Partial<TextField>)}
                  className="input flex-1" style={{ fontSize: 12 }}>
                  {!sharedFontFamily && <option value="">— mixed —</option>}
                  {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Size</label>
                <input type="number" value={sharedFontSize ?? ''} placeholder="mixed" min={6} max={72}
                  onChange={(e) => updateSelectedElements({ fontSize: Number(e.target.value) } as Partial<TextField>)}
                  className="input flex-1" style={{ fontSize: 12 }} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
                <input type="color" value={sharedColor}
                  onChange={(e) => updateSelectedElements({ color: e.target.value } as Partial<TextField>)}
                  className="w-8 h-7 rounded cursor-pointer" style={{ border: '1px solid var(--color-border)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{sharedColor || 'mixed'}</span>
              </div>
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

function AlignmentControls({ selectedIds, elements }: { selectedIds: string[]; elements: PdfElement[] }) {
  const { updateElement } = useStudioStore();
  const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
  if (selectedElements.length < 2) return null;

  const aabbs = selectedElements.map((el) => ({ el, ...getAABB(el) }));

  // Align: move element so its AABB edge matches the target, preserving center offset from AABB edge.
  const alignLeft = () => {
    const minLeft = Math.min(...aabbs.map((a) => a.left));
    for (const { el, left, cx } of aabbs) {
      const newCx = cx + (minLeft - left);
      updateElement(el.id, { position: { x: newCx - el.size.width / 2, y: el.position.y } });
    }
  };
  const alignRight = () => {
    const maxRight = Math.max(...aabbs.map((a) => a.right));
    for (const { el, right, cx } of aabbs) {
      const newCx = cx + (maxRight - right);
      updateElement(el.id, { position: { x: newCx - el.size.width / 2, y: el.position.y } });
    }
  };
  const alignTop = () => {
    const minTop = Math.min(...aabbs.map((a) => a.top));
    for (const { el, top, cy } of aabbs) {
      const newCy = cy + (minTop - top);
      updateElement(el.id, { position: { x: el.position.x, y: newCy - el.size.height / 2 } });
    }
  };
  const alignBottom = () => {
    const maxBottom = Math.max(...aabbs.map((a) => a.bottom));
    for (const { el, bottom, cy } of aabbs) {
      const newCy = cy + (maxBottom - bottom);
      updateElement(el.id, { position: { x: el.position.x, y: newCy - el.size.height / 2 } });
    }
  };
  const alignCenterH = () => {
    const avgCx = aabbs.reduce((s, a) => s + a.cx, 0) / aabbs.length;
    for (const { el } of aabbs)
      updateElement(el.id, { position: { x: avgCx - el.size.width / 2, y: el.position.y } });
  };
  const alignCenterV = () => {
    const avgCy = aabbs.reduce((s, a) => s + a.cy, 0) / aabbs.length;
    for (const { el } of aabbs)
      updateElement(el.id, { position: { x: el.position.x, y: avgCy - el.size.height / 2 } });
  };
  const distributeH = () => {
    if (selectedElements.length < 3) return;
    const sorted = [...aabbs].sort((a, b) => a.cx - b.cx);
    const minCx = sorted[0].cx;
    const maxCx = sorted[sorted.length - 1].cx;
    const step = (maxCx - minCx) / (sorted.length - 1);
    sorted.forEach(({ el }, i) =>
      updateElement(el.id, { position: { x: minCx + i * step - el.size.width / 2, y: el.position.y } })
    );
  };
  const distributeV = () => {
    if (selectedElements.length < 3) return;
    const sorted = [...aabbs].sort((a, b) => a.cy - b.cy);
    const minCy = sorted[0].cy;
    const maxCy = sorted[sorted.length - 1].cy;
    const step = (maxCy - minCy) / (sorted.length - 1);
    sorted.forEach(({ el }, i) =>
      updateElement(el.id, { position: { x: el.position.x, y: minCy + i * step - el.size.height / 2 } })
    );
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 6, padding: '4px 0', fontSize: 10,
    color: 'var(--color-text-secondary)', cursor: 'pointer', flex: 1, textAlign: 'center',
  };
  const hover = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; };
  const unhover = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[{ label: '⬛◻◻ L', fn: alignLeft, title: 'Align left edges' }, { label: '◻⬛◻ C', fn: alignCenterH, title: 'Align centers horizontally' }, { label: '◻◻⬛ R', fn: alignRight, title: 'Align right edges' }]
          .map(({ label, fn, title }) => (
            <button key={label} onClick={fn} title={title} style={btnStyle} onMouseEnter={hover} onMouseLeave={unhover}>{label}</button>
          ))}
      </div>
      <div className="flex gap-1">
        {[{ label: '⬛ Top', fn: alignTop, title: 'Align top edges' }, { label: '⬛ Mid', fn: alignCenterV, title: 'Align centers vertically' }, { label: '⬛ Bot', fn: alignBottom, title: 'Align bottom edges' }]
          .map(({ label, fn, title }) => (
            <button key={label} onClick={fn} title={title} style={btnStyle} onMouseEnter={hover} onMouseLeave={unhover}>{label}</button>
          ))}
      </div>
      {selectedElements.length >= 3 && (
        <div className="flex gap-1">
          {[{ label: '↔ Distribute H', fn: distributeH, title: 'Distribute horizontally' }, { label: '↕ Distribute V', fn: distributeV, title: 'Distribute vertically' }]
            .map(({ label, fn, title }) => (
              <button key={label} onClick={fn} title={title} style={btnStyle} onMouseEnter={hover} onMouseLeave={unhover}>{label}</button>
            ))}
        </div>
      )}
    </div>
  );
}

function PanelContent({ selected, updateElement, deleteElement }: {
  selected: PdfElement;
  updateElement: ReturnType<typeof useStudioStore.getState>['updateElement'];
  deleteElement: ReturnType<typeof useStudioStore.getState>['deleteElement'];
}) {
  const ElementIcon = selected.type === 'text' ? Type : selected.type === 'date' ? Calendar : selected.type === 'symbol' ? Shapes : PenLine;
  const elementLabel = selected.type === 'text' ? 'Text Field' : selected.type === 'date' ? 'Date Field' : selected.type === 'symbol' ? 'Symbol' : 'Signature';

  return (
    <>
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <ElementIcon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{elementLabel}</p>
        </div>
        <button onClick={() => deleteElement(selected.id)} className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }} title="Delete element"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}>
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
              { label: '°', value: Math.round(selected.rotation ?? 0), onChange: (v: number) => updateElement(selected.id, { rotation: ((v % 360) + 360) % 360 }) },
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

        {selected.type === 'symbol' && (
          <SymbolStyleSection element={selected as SymbolElement} onChange={(u) => updateElement(selected.id, u)} />
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
    </>
  );
}

export function MobilePropertiesSheet() {
  const { selectedId, selectedIds, elements, updateElement, updateSelectedElements, deleteElement, deleteSelectedElements } = useStudioStore();
  const selected = elements.find((e) => e.id === selectedId);
  const [open, setOpen] = useState(false);
  const isMultiSelect = selectedIds.length > 1;

  if (!selectedId && !isMultiSelect) return null;
  if (!isMultiSelect && !selected) return null;

  const ElementIcon = selected?.type === 'text' ? Type : selected?.type === 'date' ? Calendar : selected?.type === 'symbol' ? Shapes : PenLine;
  const elementLabel = isMultiSelect
    ? `${selectedIds.length} Elements`
    : selected?.type === 'text' ? 'Text Field' : selected?.type === 'date' ? 'Date Field' : selected?.type === 'symbol' ? 'Symbol' : 'Signature';

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-40 sm:hidden flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium"
        style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(67,56,202,0.4)' }}>
        {isMultiSelect ? <Layers className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        {elementLabel}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--color-background)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', maxHeight: '70vh' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
            </div>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2">
                {isMultiSelect ? <Layers className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> : <ElementIcon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />}
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{elementLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { isMultiSelect ? deleteSelectedElements() : deleteElement(selected!.id); setOpen(false); }}
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
              {isMultiSelect ? (
                <MultiSelectPanel selectedIds={selectedIds} elements={elements}
                  updateSelectedElements={updateSelectedElements}
                  deleteSelectedElements={() => { deleteSelectedElements(); setOpen(false); }} />
              ) : selected ? (
                <>
                  <Section title="Layout">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'X', value: Math.round(selected.position.x), onChange: (v: number) => updateElement(selected.id, { position: { ...selected.position, x: v } }) },
                        { label: 'Y', value: Math.round(selected.position.y), onChange: (v: number) => updateElement(selected.id, { position: { ...selected.position, y: v } }) },
                        { label: 'W', value: Math.round(selected.size.width), min: 40, onChange: (v: number) => updateElement(selected.id, { size: { ...selected.size, width: v } }) },
                        { label: 'H', value: Math.round(selected.size.height), min: 20, onChange: (v: number) => updateElement(selected.id, { size: { ...selected.size, height: v } }) },
                        { label: '°', value: Math.round(selected.rotation ?? 0), onChange: (v: number) => updateElement(selected.id, { rotation: ((v % 360) + 360) % 360 }) },
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

                  {selected.type === 'symbol' && (
                    <SymbolStyleSection element={selected as SymbolElement} onChange={(u) => updateElement(selected.id, u)} />
                  )}

                  {selected.type === 'signature' && (
                    <Section title="Preview">
                      <div className="rounded-lg p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selected.dataUrl} alt="Signature preview" className="w-full h-14 object-contain" />
                      </div>
                    </Section>
                  )}
                </>
              ) : null}
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

function NumberInput({ label, value, min, onChange }: {
  label: string; value: number; min?: number; onChange: (v: number) => void;
}) {
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

function SymbolStyleSection({ element, onChange }: {
  element: SymbolElement;
  onChange: (u: Partial<SymbolElement>) => void;
}) {
  const SHAPE_ICONS: Record<(typeof SYMBOL_SHAPES)[number], string> = {
    check: '✓', cross: '✕', circle: '○', star: '★',
  };
  return (
    <Section title="Symbol">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Shape</label>
          <div className="flex-1 grid grid-cols-4 gap-1.5">
            {SYMBOL_SHAPES.map((shape) => (
              <button key={shape} type="button" onClick={() => onChange({ shape })}
                className="flex items-center justify-center h-8 rounded-lg text-sm"
                style={{
                  background: element.shape === shape ? '#EEF2FF' : 'var(--color-surface)',
                  border: element.shape === shape ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  color: element.shape === shape ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}>
                {SHAPE_ICONS[shape]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
          <input type="color" value={element.color} onChange={(e) => onChange({ color: e.target.value })}
            className="w-8 h-7 rounded cursor-pointer" style={{ border: '1px solid var(--color-border)' }} />
          <div className="flex items-center gap-1 flex-wrap">
            {SYMBOL_PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => onChange({ color: c })}
                className="w-5 h-5 rounded-full shrink-0"
                style={{ background: c, border: element.color === c ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs w-10 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Thick</label>
          <input type="range" min={0.06} max={0.35} step={0.01} value={element.strokeWidth}
            onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
            className="flex-1" disabled={element.shape === 'star'} />
        </div>
      </div>
    </Section>
  );
}

function TextStyleSection({ element, onChange }: {
  element: TextField | DateField;
  onChange: (u: Partial<TextField | DateField>) => void;
}) {
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