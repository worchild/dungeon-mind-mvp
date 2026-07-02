# Sprint 2 – Engine Foundation

## Goal

Transform the prototype into a maintainable game engine while preserving the existing playable demo.

## Deliverables

- Modular codebase: engine, UI, state, validation, AI placeholder
- JSON-driven dungeon loading from `data/dungeon.json`
- Central action dispatcher in `src/engine/rules.js`
- State validator in `src/validation/validator.js`
- Improved project documentation
- Version `0.3.0`

## Definition of Done

- Game loads through GitHub Pages
- Movement works
- Search works
- Loot works
- Monster defeat works
- Save/load works
- Export/import works
- Validator reports state OK on a clean game
- No gameplay rules are embedded in HTML

## Notes

`index.html` now loads JavaScript as ES modules. This is better architecture, but it means the game should be run through GitHub Pages or a local web server.
