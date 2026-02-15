# Components

All React components. No CSS framework — inline styles + CSS custom properties from `src/styles/theme.css`.

## Layout

- `layout/AppHeader.tsx` — Army name, faction, points, view mode toggle
- `layout/AppLayout.tsx` — Main content + sidebar grid
- `layout/Sidebar.tsx` — Army rule, detachment rule, stratagems, character pairings panel, transport allocations panel, points breakdown

## Card View (`card-view/`)

Full unit cards grouped by role:
- `CardView.tsx` — Role-grouped card grid
- `UnitCard.tsx` — Card wrapper with header (name, points, role badge, warlord, enhancement)
- `StatBar.tsx` — M/T/Sv/W/Ld/OC stat display (handles multi-model stat lines)
- `WeaponsTable.tsx` — Ranged + melee weapons table with profile grouping
- `AbilityChips.tsx` — Core/faction/datasheet ability chips with tooltip descriptions
- `KeywordsRow.tsx` — Keyword tags
- `LeaderSection.tsx` — Leader pairing dropdown for characters, "Led by" display for units
- `TransportSection.tsx` — Capacity bar for transports, transport assignment dropdown for units

## Table View (`table-view/`)

Compact table with expandable rows:
- `TableView.tsx` — Full table with toolbar, section groups, expandable unit rows
- `ExpandedRow` — Weapons table, abilities, keywords, equipment
- `ExpandedRowControls` — Leader pairing + transport assignment (same functionality as card view)

## Shared (`shared/`)

- `RoleBadge.tsx` — Color-coded role badge (Characters, Battleline, etc.)
- `CapacityBar.tsx` — Visual capacity bar (green → yellow → red)
- `PairingDropdown.tsx` — Reusable dropdown for leader assignment

## Patterns

- Components subscribe to Zustand slices via `useArmyStore(s => s.someSlice)`
- Transport capacity uses `useTransportUsedCapacity()` hook for reactivity — never call the imperative `getTransportUsedCapacity()` in components
- Hooks must be called unconditionally (not inside conditionals or loops) — extract sub-components when needed (see `TransportItem` in Sidebar)
- CSS custom properties: `--bg-card`, `--text-bright`, `--text-dim`, `--accent-gold`, `--role-char`, `--border`, etc.
