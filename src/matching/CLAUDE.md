# Matching & Enrichment

Merges parsed army list data with Wahapedia stats to produce `EnrichedArmyList`.

## Pipeline

```
ParsedUnit → matchDatasheet() → datasheetId → getModels/getWargear/getAbilities/... → EnrichedUnit
```

## Files

- **`enrichment.ts`** — Main enrichment engine. Orchestrates all matching, builds EnrichedUnit with stats, weapons, abilities, keywords, leader mappings, transport capacity, and `modelCountByProfile`.
- **`name-matcher.ts`** — Faction, datasheet, detachment, and enhancement name matching with normalization (lowercase, smart quote → straight apostrophe).
- **`weapon-matcher.ts`** — Matches parsed weapon names to Wahapedia wargear. Handles profile suffixes: "Gork's Klaw" matches both "Gork's Klaw - strike" and "Gork's Klaw - sweep". Unmatched weapons get `A='-', S='-'` so enrichment can move them to equipment.
- **`leader-classifier.ts`** — Scans ability text to detect secondary leaders (characters whose text contains phrases like "already been attached" or "already has a CHARACTER").

## Transport Capacity Parsing

`parseTransportCapacity()` extracts from natural language text:
- **Base capacity**: "transport capacity of 22" → `baseCapacity: 22`
- **Keyword multipliers** (`matchType: 'keyword'`): "Each Mega Armour or Jump Pack model takes up the space of 2 models" — applies via unit keywords to ALL models in a unit
- **Model multipliers** (`matchType: 'model'`): "The Ghazghkull Thraka model takes up the space of 4 models" — applies ONLY to the specific named model
- **Exclusions**: "cannot transport Jump Pack or Ghazghkull Thraka models"

The `matchType` distinction is critical: without it, Makari would incorrectly get 4 slots because the unit keyword "Ghazghkull Thraka" would match the model multiplier.

## modelCountByProfile

Maps lowercased Wahapedia profile names to actual model counts from the parsed unit. Built during enrichment by matching stat profile names (e.g., "BOY", "BOSS NOB") to parsed model names (e.g., "Boy" count 9, "Boss Nob" count 1). Unmatched profiles get remaining count distributed evenly.

## Tests

- `matching.test.ts` — Name matching, weapon matching, leader classification, transport parsing (12 tests)
- Tests in `real-army.test.ts` also cover enrichment integration
