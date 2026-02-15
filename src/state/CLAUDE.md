# State (Zustand Store)

Single Zustand store in `army-store.ts` manages all app state.

## State Shape

- `armyList: EnrichedArmyList | null` — The enriched army data
- `leaderPairings: Record<unitInstanceId, characterInstanceId[]>` — Maps unit → attached leaders (0-2)
- `transportAllocations: Record<transportInstanceId, unitInstanceId[]>` — Maps transport → embarked units
- `viewMode: 'card' | 'table'`
- `expandedUnits: Set<string>` — Expanded unit IDs in table view

## Key Actions

- `importArmyList(text)` — Runs parser → enrichment pipeline, resets pairings/allocations
- `setLeaderPairing(characterId, unitId)` — Validates: can lead? max 2? secondary leader rules?
- `assignToTransport(unitId, transportId)` — Validates capacity, exclusions, multipliers
- `removeFromTransport(unitId)` / `removeLeaderPairing(characterId)`

## Transport Capacity Calculation

`calculateUsedCapacity()` sums slots for all units in a transport + their attached leaders:

```
For each embarked unit:
  slots += getModelSlots(unit, transportCapacity)
  For each leader attached to this unit:
    slots += getModelSlots(leader, transportCapacity)
```

`getModelSlots()` iterates model stat profiles, checking:
1. **Model multipliers** first — match against model name (e.g., "GHAZGHKULL THRAKA" → 4 slots)
2. **Keyword multipliers** second — match against unit keywords (e.g., "Mega Armour" → 2 slots)
3. Default to 1 slot per model

Uses `modelCountByProfile` to get correct per-profile counts (Boyz: BOY=9, BOSS NOB=1).

## Selectors / Hooks

- `useTransportUsedCapacity(transportId)` — **Reactive hook** that re-renders when allocations or pairings change. Use this in components.
- `getTransportUsedCapacity(transportId)` — Imperative version using `getState()`. Only for non-component contexts (e.g., inside store actions).
- `getCharacterPairedUnit(characterId)` — Returns the unit ID this character leads
- `getUnitTransport(unitId)` — Returns the transport ID this unit is in

## Leader Pairing Rules

- Max 2 leaders per unit
- If unit has 1 leader already, the new one must be a secondary leader (or the existing one must be)
- Character's `leaderMapping.canLead` lists which unit names it can attach to
- Secondary leaders detected by `leader-classifier.ts` scanning ability text
