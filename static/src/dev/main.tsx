import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MapShot } from './MapShot';

/**
 * Entry point for `/mapshot.html` — dev scaffolding, see `MapShot.tsx` for
 * what it is and why it's a separate Vite entry rather than a panel inside
 * the game.
 *
 * The build never takes this file: Vite's production input is `index.html`
 * alone, so `mapshot.html` is served by `npm run dev` and simply isn't in
 * `dist/`. The guard below is the second lock — if somebody ever adds this to
 * `build.rollupOptions.input`, the page says no rather than shipping a tool
 * that renders the whole town with no save and no story gating.
 */
const root = createRoot(document.getElementById('root')!);

if (import.meta.env.DEV) {
  root.render(
    <StrictMode>
      <MapShot />
    </StrictMode>,
  );
} else {
  root.render(
    <div className="mapshot mapshot__refusal">
      The map inspector is dev scaffolding and does not run in a production
      build. Run <code>npm run dev</code> and open <code>/mapshot.html</code>.
    </div>,
  );
}
