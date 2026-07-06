# Dungeon Mind v1.0.0 - Living Dungeon Director

Release date: 2026-07-06

## Status

Locked playable release.

This release promotes the tested v0.9.3 release candidate to v1.0.0.

## Release goals

- Provide a complete 10-room exploration dungeon.
- Keep the rules engine deterministic.
- Keep hidden Dungeon Mind / Dungeon Council reasoning separate from player-facing output.
- Support treasure-hunt exploration through clues, inspectable features, and inventory use.
- Introduce living dungeon behaviour through dynamic events, noise, hidden awareness, and simple movement.
- Keep Developer Diagnostics hidden by default for playtesters.

## Included systems

- JSON-driven dungeon content
- Central action dispatcher
- State validation
- Save/load
- Export/import save JSON
- Threat meter
- Clue Journal
- Insight messages
- Inspectable room features
- Actionable inventory
- Ritual Signs progress panel
- Dynamic event queue
- Event history
- Dungeon personality and Council diagnostics
- Hidden living dungeon state
- Noise tracking
- Hidden awareness tracking
- Basic movement between connected rooms
- Show Dev Tools toggle

## Deferred from v1.0.0

- Factions
- Full combat system
- Procedural multi-dungeon campaign generation
- AI-generated live room images
- Mobile-specific UI redesign beyond responsive layout
- Persistent cloud saves

## Recommended smoke test

1. Hard refresh the GitHub Pages site.
2. Confirm the header shows v1.0.0.
3. Start in R01 and move through the dungeon.
4. Inspect features and collect clues.
5. Confirm the Ritual Signs panel updates.
6. Collect and inspect/use inventory items.
7. Recover the Dawn Key in R10.
8. Confirm save/load works.
9. Toggle Show Dev Tools and confirm diagnostics display hidden state.

## Play URL

```text
https://worchild.github.io/dungeon-mind-mvp/
```
