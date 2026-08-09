import { Suspense, lazy, useEffect, useState } from 'react';
import { GameProvider, useGame } from './state/GameContext';
import { TitleScreen } from './ui/TitleScreen';
import { Hud } from './ui/Hud';
import { Overworld } from './world/Overworld';
import { SettingsPanel } from './ui/SettingsPanel';
import { Crew } from './ui/Crew';
import { Phone } from './ui/Phone';
import { setMuted } from './systems/audio';

/*
 * Dev scaffolding, genuinely out of the production bundle.
 *
 * This was a static import rendered behind a plain boolean. The *button* that
 * opens it is gated on `import.meta.env.DEV`, so players could never reach it —
 * but a runtime check doesn't remove a static import, and `Workbench` pulls in
 * `workbench.css`, whose side effect makes it untree-shakeable regardless. The
 * whole thing shipped, unreachable, along with everything it imports. A dynamic
 * import inside a DEV branch is what actually keeps it out.
 */
const Workbench = import.meta.env.DEV
  ? lazy(() => import('./ui/Workbench').then((m) => ({ default: m.Workbench })))
  : null;

function Shell() {
  const { save, newGame, continueGame } = useGame();
  const [workbench, setWorkbench] = useState(false);
  const [settings, setSettings] = useState(false);
  const [crew, setCrew] = useState(false);
  const [phone, setPhone] = useState(false);

  // The audio module holds its own mute flag so a cue can fire from anywhere
  // without threading the save through. This keeps it in step on load and
  // after a Continue, which the settings toggle alone would not.
  useEffect(() => {
    setMuted(save?.settings.audioMuted ?? false);
  }, [save?.settings.audioMuted]);

  /*
   * There is deliberately no decay-on-mount here. Heat decays against
   * `world.day` and nothing else, so opening the tab is free and closing it for
   * a week costs nothing — the fiction didn't move (Heat System 02).
   */

  // The in-game flicker control (settings.reducedFlicker) drives a root data
  // attribute, so every glitch surface honours it without prop-drilling.
  useEffect(() => {
    document.documentElement.dataset.reducedFlicker = save?.settings.reducedFlicker ? 'true' : 'false';
  }, [save?.settings.reducedFlicker]);

  if (!save) {
    return <TitleScreen onStart={newGame} onContinue={continueGame} />;
  }

  return (
    <div className="game">
      <Overworld />
      <Hud
        onOpenWorkbench={() => setWorkbench(true)}
        onOpenSettings={() => setSettings(true)}
        onOpenCrew={() => setCrew(true)}
        onOpenPhone={() => setPhone(true)}
      />
      {crew && <Crew onClose={() => setCrew(false)} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
      {phone && <Phone onClose={() => setPhone(false)} />}
      {Workbench && workbench && (
        <Suspense fallback={null}>
          <Workbench onClose={() => setWorkbench(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
