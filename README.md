# Dungeon Mind v1.0.0 - Living Dungeon Director

Dungeon Mind is a browser-based dungeon exploration engine. The rules engine owns mechanics, the Dungeon Mind state owns truth, and the UI only renders player-safe state.

## Play

GitHub Pages:

```text
https://worchild.github.io/dungeon-mind-mvp/
```

## Version

Current version: **1.0.0 Living Dungeon Director**

## v1.0 status

This is the first locked playable release. Factions are intentionally deprioritised for later v1.x work. The focus is treasure-hunt exploration, player-safe presentation, hidden Director systems, dynamic dungeon events, ritual progress, and basic living dungeon behaviour.

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
- Search, loot, clues, simple encounters, threat meter
- Save/load using browser localStorage
- Export/import save JSON
- Player-safe rendering and placeholder image system
- Dungeon Council diagnostics model
- Dungeon personality profile that biases Council priorities
- Director action queue for future intent and pacing beats
- Dynamic event queue for Director-scheduled dungeon events
- Event history so resolved and expired events can be inspected in diagnostics
- Deterministic event processing by trigger
- Living event library with Atmosphere, Tension, Discovery, and Response categories
- Deterministic unused-event selection to reduce repetition
- Noise tracking for player actions
- Hidden awareness state for mobile dungeon presence
- Basic movement between connected rooms
- Movement history visible in developer diagnostics
- Ritual Signs panel for Empty Hand, Open Eye, and Dawn Thread progress
- Developer Diagnostics hidden by default with a Show Dev Tools toggle
- Structured clue metadata for treasure-hunt exploration
- Clue Journal with clue titles, importance, tags, leads, and destination hints
- Insight messages when discovered clues connect
- Inspectable room features that reveal clue, flavour, warning, or threat results
- Actionable inventory items with Inspect and Use here actions
- Item use can create item insights and respond differently by room

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
    eventQueue.js
    livingDungeon.js
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

## Living dungeon principle

The dungeon should feel like it remembers. Player actions create noise. Hidden systems track awareness and movement. The player sees only safe outputs, such as nearby movement or a presence entering the current room, while the hidden state remains available in diagnostics.

## Dynamic event principle

The Dungeon Director schedules future events, but the deterministic rules engine decides when they resolve. A search might queue an atmosphere or tension event for the next room enter. Nothing happens immediately; when the correct trigger fires, the event resolves into a player-safe log entry and moves into event history.

## Explore mode principle

Explore Mode should feel like a treasure hunt, not a checklist. Rooms contain visible features, inspectable details reveal clues or flavour, items can be inspected or used in context, clues point toward other rooms or ritual ideas, and the journal helps the player connect discoveries without leaking hidden Dungeon Mind data.

## Architecture principle

The UI sends actions. The rules engine decides outcomes. The state store persists truth. The validator checks integrity. AI modules must only receive player-visible data.

The hidden Dungeon Council and Dungeon Director may reason about pacing, clues, rewards, encounters, event scheduling, noise, awareness, movement, and visibility, but only player-safe results should appear in the play experience.
