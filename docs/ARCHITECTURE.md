# Dungeon Mind Architecture v0.3.0

## Layers

```text
Player
  ↓
UI Renderer
  ↓
Action Dispatcher / Rules Engine
  ↓
State Store
  ↓
Dungeon JSON
```

## Responsibilities

### UI

- Render current room
- Render player inventory, clues, log, map, and threat meter
- Dispatch player actions
- Never mutate gameplay state directly

### Rules Engine

- Own movement, search, loot, monster defeat, save/load, import, reset
- Update state through deterministic logic
- Maintain objective and threat logic

### State Store

- Hold current Dungeon Mind state
- Load initial state from JSON
- Save/load browser localStorage

### Validator

- Check schema version
- Check current room exists
- Check exits point to valid rooms
- Check non-final rooms have exits
- Check player-visible fields do not leak hidden keys
- Check threat bounds

### AI Placeholder

- Prepare safe player-visible prompt objects only
- Never receive hidden room notes, secret answers, or full Dungeon Mind state
