# KURT

He has gas. He has a dream.

A one-button, Flappy-Bird-style arcade game. Tap to fart. Fly far. Try to keep
your dignity.

## Play locally

No build step. Any static file server works:

```
cd kurt
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

Static HTML/CSS/JS, zero dependencies, zero backend. Point any static host
(GitHub Pages, Cloudflare Pages, Netlify, Vercel) at the `kurt/` directory
and it's live. No build command, no environment variables, no API keys.

## Architecture

- `index.html` / `styles.css` — layout, HUD, and screen overlays (DOM), safe-area aware
- `src/config.js` — every tunable constant (physics, obstacles, grades, power-ups, cosmetics)
- `src/game.js` — state machine (start / playing / game over) and the main loop
- `src/kurt.js` — player physics (tap thrust, gravity, rotation, squash/stretch) and rendering
- `src/hair.js` — procedural hair-strand physics
- `src/obstacles.js` — themed obstacle spawning, movement, rendering, hazards (birds/helicopters)
- `src/powerups.js` — rare power-up spawning, effects, rendering
- `src/particles.js` — fart cloud / sparkle particle system
- `src/background.js` — parallax sky, skyline, and ground
- `src/scoring.js` / `src/progression.js` — distance, farts, efficiency, streak, F-grades
- `src/collision.js` — generous circle-vs-rect / circle-vs-circle collision
- `src/input.js` — unified tap handling (pointer + keyboard, single-fire)
- `src/audio.js` — all sound effects synthesized live via the Web Audio API (no audio files)
- `src/ui.js` — DOM screen/HUD updates
- `src/storage.js` — localStorage persistence (personal best, grade, lifetime farts, settings)

Everything renders to a single `<canvas>` using `requestAnimationFrame` with
delta-time, except the start/HUD/game-over chrome, which is plain DOM updated
only on state changes.
