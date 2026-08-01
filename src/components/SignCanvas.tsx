// Declarative wrapper around the imperative renderer: give it a Design,
// it keeps the canvas painted (after fonts are ready).
import { useEffect, useRef } from 'react';
import { Design, RenderOpts, renderSign, Bounds } from '../lib/render-core';
import { ALL_SIGN_FONTS, loadFonts } from '../lib/fonts';

interface Props {
  design: Design;
  scale?: number;
  watermark?: boolean;
  selection?: RenderOpts['selection'];
  onBounds?: (b: Bounds) => void;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function SignCanvas({ design, scale = 2, watermark, selection, onBounds, className, canvasRef }: Props) {
  const innerRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? innerRef;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFonts([design.headingFont, design.bodyFont, ...ALL_SIGN_FONTS]);
      if (cancelled || !ref.current) return;
      const b = renderSign(ref.current, design, { scale, watermark, selection });
      onBounds?.(b);
    })();
    return () => { cancelled = true; };
  });

  return <canvas ref={ref} className={className} />;
}
