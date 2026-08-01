// Design state hook: single source of truth for the designer, persisted to
// localStorage so a design survives reloads and the checkout round-trip.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Design, SHAPE_CONFIGS, applyTemplate as applyTemplateCore,
  defaultDesign, getDefaultLayout,
} from '../lib/render-core';

export const STORAGE_KEY = 'reviewsign.design.v2';

function load(): Design {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Design>;
      const d: Design = { ...defaultDesign(), ...saved, visible: { ...defaultDesign().visible, ...(saved.visible ?? {}) } };
      if (!SHAPE_CONFIGS[d.shape]) { d.shape = 'portrait'; d.layout = getDefaultLayout('portrait'); }
      if (!d.layout) d.layout = getDefaultLayout(d.shape);
      // Designs saved before materials became mandatory get the default stock.
      if (!d.engraveMaterial) d.engraveMaterial = defaultDesign().engraveMaterial;
      return d;
    }
  } catch { /* fall through */ }
  const d = defaultDesign();
  d.layout = getDefaultLayout(d.shape);
  return d;
}

export function useDesign() {
  const [design, setDesign] = useState<Design>(load);
  const saveTimer = useRef<number>(undefined);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); } catch { /* quota */ }
    }, 250);
    return () => window.clearTimeout(saveTimer.current);
  }, [design]);

  const patch = useCallback((p: Partial<Design>) => setDesign((d) => ({ ...d, ...p })), []);

  const applyTemplate = useCallback((tplId: string) =>
    setDesign((d) => applyTemplateCore(d, tplId)), []);

  const setShape = useCallback((shape: Design['shape']) =>
    setDesign((d) => ({ ...d, shape, layout: getDefaultLayout(shape) })), []);

  const resetLayout = useCallback(() =>
    setDesign((d) => ({ ...d, layout: getDefaultLayout(d.shape) })), []);

  return { design, setDesign, patch, applyTemplate, setShape, resetLayout };
}
