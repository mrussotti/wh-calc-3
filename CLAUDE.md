# Warhammer 40K Army List Manager

## What This Is

React SPA that parses army list exports from the official Warhammer 40K app, enriches them with full 10th Edition stats/weapons/abilities from Wahapedia's bulk CSV data, and manages character leader pairings + transport allocations.

## Commands

- `npm run dev` — Start dev server
- `npm test` — Run all tests (vitest)
- `npm run test:watch` — Run tests in watch mode
- `npm run fetch-data` — Download Wahapedia CSVs and build `src/data/generated/wahapedia.json` (required before first run)
- `npm run build` — TypeScript check + production build
- `npm run lint` — ESLint

## Tech Stack

- React 19 + TypeScript + Vite 7
- Zustand for state management
- Vitest for testing
- tsx for running build-time scripts
- No CSS framework — inline styles + CSS custom properties in `src/styles/theme.css`

## Architecture

```
Text paste → Parser → ParsedArmyList → Enrichment → EnrichedArmyList → Zustand store → React UI
                                            ↑
                                    Wahapedia JSON data
```

**Data flow**: User pastes army list text → `army-list-parser.ts` produces `ParsedArmyList` → `enrichment.ts` merges with Wahapedia data → `EnrichedArmyList` stored in Zustand → components render.

## Key Directories

- `src/parser/` — Army list text parser (state machine)
- `src/matching/` — Enrichment engine, name matching, weapon matching
- `src/state/` — Zustand store with leader pairing + transport logic
- `src/data/` — Wahapedia data access layer (`generated/` is .gitignored)
- `src/types/` — All TypeScript interfaces
- `src/components/` — React components (card-view, table-view, layout, shared)
- `scripts/` — Build-time data fetch script

## Important Conventions

- All Wahapedia data lives in `src/data/generated/wahapedia.json` — this file is .gitignored and must be generated via `npm run fetch-data`
- Smart quotes (U+2019 `'`) must be normalized to straight apostrophes for name matching
- Weapon profiles use suffix matching: "Gork's Klaw" matches "Gork's Klaw - strike" + "Gork's Klaw - sweep"
- Transport capacity multipliers have two types: `keyword` (applies via unit keywords like "Mega Armour") and `model` (applies only to specific model names like "Ghazghkull Thraka")
- `modelCountByProfile` on EnrichedUnit maps lowercased Wahapedia profile names to actual parsed model counts
- Reactive transport capacity uses `useTransportUsedCapacity()` hook, not the imperative `getTransportUsedCapacity()`

## 10th Edition Rules That Matter

- Units can have 0, 1, or 2 attached leaders (second must be a "secondary" leader)
- Leaders embark with their unit and count toward transport capacity
- Transport capacity has per-model multipliers (Mega Armour = 2 slots) and exclusions (cannot transport Jump Pack models)
- Army Rule (faction-wide) and Detachment Rule (player-selected) are both displayed
