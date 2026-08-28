import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AssetGallery } from './AssetGallery';

/**
 * Entry point for `/assetgallery.html` — dev scaffolding, see
 * `AssetGallery.tsx` for what it is and why it's a separate Vite entry
 * rather than a panel inside the game. Same guard as `src/dev/main.tsx`:
 * the build never takes this file (Vite's production input is `index.html`
 * alone), and this is the second lock in case that ever changes by accident.
 */
const root = createRoot(document.getElementById('root')!);

if (import.meta.env.DEV) {
  root.render(
    <StrictMode>
      <AssetGallery />
    </StrictMode>,
  );
} else {
  root.render(
    <div className="assetgallery assetgallery__refusal">
      The asset gallery is dev scaffolding and does not run in a production
      build. Run <code>npm run dev</code> and open <code>/assetgallery.html</code>.
    </div>,
  );
}
