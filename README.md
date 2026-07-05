# Dungeon Mind v0.8.1 – Inspectable Features

Dungeon Mind is a browser-based dungeon exploration engine. The rules engine owns mechanics, the Dungeon Mind state owns truth, and the UI only renders player-safe state.

## Play

GitHub Pages:

```text
https://worchild.github.io/dungeon-mind-mvp/
```

## Version

Current version: **0.8.1 Inspectable Features**

## Run locally

Use GitHub Pages, Netlify, Vercel, or a local web server.

Because the app loads `data/dungeon.json` using `fetch`, directly double-clicking `index.html` may fail in some browsers.

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
- Dungeon Council diagnostics model
- Dungeon personality profile that biases Council priorities
- Director action queue for future intent and pacing beats
- Structured clue metadata for treasure-hunt exploration
- Clue Journal with clue titles, importance, tags, leads, and destination hints
- Insight messages when discovered clues connect
- Inspectable room features that reveal clue, flavour, warning, or threat results

## Project structure

```text
index.html
style.css
data/
  dungeon.json
src/
  app-v070.js
  app.js
  engine/
    actionQueue.js
    council.js
    personality.js
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

## Explore mode principle

Explore Mode should feel like a treasure hunt, not a checklist. Rooms contain visible features, inspectable details reveal clues or flavour, clues point toward other rooms or ritual ideas, and the journal helps the player connect discoveries without leaking hidden Dungeon Mind data.

## Architecture principle

The UI sends actions. The rules engine decides outcomes. The state store persists truth. The validator checks integrity. AI modules must only receive player-visible data.

The hidden Dungeon Council may reason about pacing, clues, rewards, encounters, and visibility, but only player-safe results should appear in the play experience.
