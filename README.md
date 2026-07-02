# Dungeon Mind v0.3.0 – Engine Foundation

Dungeon Mind is a browser-based dungeon exploration engine. The rules engine owns mechanics, the Dungeon Mind state owns truth, and the UI only renders player-safe state.

## Version

Current version: **0.3.0**

## Run

Use GitHub Pages, Netlify, Vercel, or a local web server.

Because v0.3.0 loads `data/dungeon.json` using `fetch`, directly double-clicking `index.html` may fail in some browsers.

Local server option:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Features

- Modular JavaScript codebase
- JSON-driven dungeon content
- Central action dispatcher
- State validator
- 10-room exploration reference dungeon
- Search, loot, clues, simple monsters, threat meter
- Save/load using browser localStorage
- Export/import save JSON
- Player-safe rendering and placeholder image system

## Project structure

```text
index.html
style.css
data/
  dungeon.json
src/
  app.js
  engine/
    rules.js
  state/
    store.js
  ui/
    renderer.js
  validation/
    validator.js
  ai/
    promptBuilder.js
assets/
images/
docs/
tests/
```

## Architecture principle

The UI sends actions. The rules engine decides outcomes. The state store persists truth. The validator checks integrity. AI modules must only receive player-visible data.
