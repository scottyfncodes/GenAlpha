import { useEffect, useMemo, useRef, useState } from 'react';
import { ASSET_MANIFEST, type AssetCategory, type AssetSlot } from '../art/manifest';
import { drawAnchorMarker, drawAssetSlot, ensureAllAssetsLoading, categoryColor, assetIsPlaceholder } from '../art/assetLoader';
import './assetgallery.css';

/**
 * THE ASSET GALLERY — the placeholder visual test scene the art pipeline
 * calls for. Same status and the same reasons as `MapShot.tsx` (see its own
 * doc comment): the manifest is the one part of this run that can only
 * really be judged by looking at it, so this is the surface that calls the
 * real `drawAssetSlot`/`drawAnchorMarker` for every slot in
 * `art/manifest.ts`, at any display scale, with nothing else in the way.
 *
 * Its own Vite entry (`/assetgallery.html`), not a panel inside the game —
 * same two reasons `MapShot.tsx` gives: Vite's production build only takes
 * `index.html` as input, so this never ships, and it needs no `GameContext`.
 *
 * Every slot in this run's manifest has no backing file under
 * `public/art/`, so every cell renders its placeholder — a category-tinted
 * checkerboard at the slot's exact declared size, with a magenta crosshair
 * on its true anchor point (art bible §4). Drop a correctly-sized
 * `<id>.png` into `public/art/` and reload: the same cell starts drawing
 * that file instead, at the same size, in the same place — that hand-off is
 * the entire point of the system this page is proving out.
 */

const CATEGORIES: AssetCategory[] = [
  'character',
  'small-prop',
  'medium-prop',
  'large-prop',
  'building',
  'landmark',
  'vehicle',
  'terrain',
  'technology',
  'effect',
  'ui-icon',
];

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  character: 'Characters',
  'small-prop': 'Small props',
  'medium-prop': 'Medium props',
  'large-prop': 'Large props',
  building: 'Buildings',
  landmark: 'Landmarks',
  vehicle: 'Vehicles',
  terrain: 'Terrain',
  technology: 'Technology',
  effect: 'Effects / decals',
  'ui-icon': 'UI icons',
};

const PAD = 10;
const LABEL_H = 24;
const GAP = 10;
const CATEGORY_GAP = 30;
const HEADER_H = 22;
const MARGIN = 16;

interface View {
  scale: number;
  category: AssetCategory | 'all';
  q: string;
  markers: boolean;
}

function readView(): View {
  const q = new URLSearchParams(window.location.search);
  const scaleRaw = Number(q.get('scale'));
  const category = q.get('category') as AssetCategory | 'all' | null;
  return {
    scale: [1, 2, 4].includes(scaleRaw) ? scaleRaw : 2,
    category: category && (category === 'all' || CATEGORIES.includes(category)) ? category : 'all',
    q: q.get('q') ?? '',
    markers: q.get('markers') !== '0',
  };
}

function writeView(v: View) {
  const q = new URLSearchParams({
    scale: String(v.scale),
    category: v.category,
    q: v.q,
    markers: v.markers ? '1' : '0',
  });
  window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
}

interface Cell {
  slot: AssetSlot;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
}

/** Lays every visible slot out into a wrapped grid, grouped by category,
 * each cell sized to its own true `width`x`height` at the current display
 * scale — a slot's cell size IS its relative on-screen size, which is the
 * whole reason to look at this page instead of just reading the manifest. */
function layout(slots: AssetSlot[], scale: number, canvasWidth: number): { cells: Cell[]; sections: { label: string; y: number }[]; totalHeight: number } {
  const cells: Cell[] = [];
  const sections: { label: string; y: number }[] = [];
  let cursorY = MARGIN;

  for (const category of CATEGORIES) {
    const inCategory = slots.filter((s) => s.category === category);
    if (inCategory.length === 0) continue;

    sections.push({ label: `${CATEGORY_LABEL[category]} (${inCategory.length})`, y: cursorY });
    cursorY += HEADER_H;

    let cursorX = MARGIN;
    let rowH = 0;
    for (const slot of inCategory) {
      const contentW = slot.width * scale;
      const contentH = slot.height * scale;
      const cellW = Math.max(72, PAD * 2 + contentW);
      const cellH = PAD * 2 + contentH + LABEL_H;

      if (cursorX + cellW + GAP > canvasWidth - MARGIN && cursorX > MARGIN) {
        cursorX = MARGIN;
        cursorY += rowH + GAP;
        rowH = 0;
      }

      let anchorX: number;
      let anchorY: number;
      switch (slot.anchor) {
        case 'bottom-center':
          anchorX = cursorX + PAD + contentW / 2;
          anchorY = cursorY + PAD + contentH;
          break;
        case 'top-left':
          anchorX = cursorX + PAD;
          anchorY = cursorY + PAD;
          break;
        case 'center':
        case 'explicit':
        default:
          anchorX = cursorX + PAD + contentW / 2;
          anchorY = cursorY + PAD + contentH / 2;
          break;
      }

      cells.push({ slot, x: cursorX, y: cursorY, w: cellW, h: cellH, anchorX, anchorY });
      cursorX += cellW + GAP;
      rowH = Math.max(rowH, cellH);
    }
    cursorY += rowH + CATEGORY_GAP;
  }

  return { cells, sections, totalHeight: cursorY };
}

export function AssetGallery() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<View>(readView);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => writeView(view), [view]);
  useEffect(() => ensureAllAssetsLoading(), []);

  const visibleSlots = useMemo(() => {
    const q = view.q.trim().toLowerCase();
    return ASSET_MANIFEST.filter((s) => {
      if (view.category !== 'all' && s.category !== view.category) return false;
      if (q && !s.id.includes(q) && !s.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [view.category, view.q]);

  // A slow poll rather than a 60fps rAF loop: placeholders don't animate,
  // and the one thing worth catching live is a real .png landing in
  // public/art/ while this page is already open. `world/spritesheet.ts`'s
  // own images resolve in well under a second; half a second of latency
  // here costs nothing a static gallery page needs to avoid.
  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const scroller = scrollRef.current;
      if (!canvas || !ctx || !scroller) return;

      // The canvas' own CSS size is pinned to its buffer size (below) rather
      // than stretched to fill a flex box — the content can run taller than
      // the viewport, and it's the surrounding `.assetgallery__scroll` div
      // that scrolls, not the canvas rescaling its drawing to fit.
      const w = Math.max(320, Math.round(scroller.clientWidth));
      const { cells, sections, totalHeight } = layout(visibleSlots, viewRef.current.scale, w);
      const h = Math.max(240, totalHeight);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#14131a';
      ctx.fillRect(0, 0, w, h);

      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(236, 226, 208, 0.85)';
      for (const section of sections) {
        ctx.fillText(section.label, MARGIN, section.y + 15);
      }

      for (const cell of cells) {
        ctx.strokeStyle = 'rgba(236, 226, 208, 0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.w - 1, cell.h - 1);

        drawAssetSlot(ctx, cell.slot, cell.anchorX, cell.anchorY);
        if (viewRef.current.markers) drawAnchorMarker(ctx, cell.anchorX, cell.anchorY);

        const labelY = cell.y + cell.h - LABEL_H;
        ctx.font = '9px monospace';
        ctx.fillStyle = categoryColor(cell.slot.category);
        ctx.fillText(cell.slot.id, cell.x + PAD, labelY + 11, cell.w - PAD * 2);
        ctx.fillStyle = 'rgba(236, 226, 208, 0.55)';
        const status = assetIsPlaceholder(cell.slot) ? 'placeholder' : 'real art';
        ctx.fillText(`${cell.slot.width}x${cell.slot.height} · ${cell.slot.anchor} · ${status}`, cell.x + PAD, labelY + 21, cell.w - PAD * 2);
      }
    };

    draw();
    const interval = window.setInterval(draw, 500);
    window.addEventListener('resize', draw);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('resize', draw);
    };
  }, [visibleSlots]);

  const set = (patch: Partial<View>) => setView((v) => ({ ...v, ...patch }));

  return (
    <div className="assetgallery">
      <div className="assetgallery__bar">
        <span className="assetgallery__title">GenAlpha · asset gallery</span>

        <label className="assetgallery__field">
          scale
          <select value={view.scale} onChange={(e) => set({ scale: Number(e.target.value) })}>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>

        <label className="assetgallery__field">
          category
          <select value={view.category} onChange={(e) => set({ category: e.target.value as View['category'] })}>
            <option value="all">all ({ASSET_MANIFEST.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="assetgallery__field">
          <input type="text" placeholder="filter by id/label" value={view.q} onChange={(e) => set({ q: e.target.value })} />
        </label>

        <label className="assetgallery__field">
          <input type="checkbox" checked={view.markers} onChange={(e) => set({ markers: e.target.checked })} />
          anchor markers
        </label>

        <span className="assetgallery__count">{visibleSlots.length} slot{visibleSlots.length === 1 ? '' : 's'}</span>
      </div>

      <div ref={scrollRef} className="assetgallery__scroll">
        <canvas ref={canvasRef} className="assetgallery__canvas" />
      </div>
    </div>
  );
}
