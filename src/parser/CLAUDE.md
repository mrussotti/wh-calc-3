# Parser

Line-by-line state machine that parses the official Warhammer app's army list export format.

## Input Format

```
Army Name  (2000 Points)
Faction Name
Detachment Name
Strike Force (2,000 Points)
CHARACTERS
Unit Name (95 Points)
 • 1x Weapon Name
 • Enhancements: Enhancement Name
Another Unit (235 Points)
 • 1x Model A
    • Warlord
    ◦ 1x Weapon A
 • 1x Model B
    ◦ 1x Weapon B
BATTLELINE
...
```

## Two Weapon List Formats

1. **Structured** — Models with sub-weapons (Ghazghkull, Boyz, Kommandos):
   ```
   • 1x Ghazghkull Thraka
       ◦ 1x Gork's Klaw
   • 1x Makari
       ◦ 1x Makari's stabba
   ```

2. **Flat** — Weapons listed directly as bullets, no model grouping (Beastboss, Warboss, Trukk):
   ```
   • 1x Beast Snagga klaw
   • 1x Beastchoppa
   • 1x Shoota
   ```

The parser detects flat lists in post-processing: if ALL bullet items have zero sub-weapons, they're treated as weapons on an implicit model named after the unit.

## Gotchas

- Smart quotes: `\u2019` (right single quote) appears in names like "Kunnin' but Brutal" and "Gork's Klaw"
- Bullets: `\u2022` (•) for models/items, `\u25E6` (◦) for sub-weapons
- Equipment without stats (e.g., 'Ard Case): In mixed format, items without sub-weapons that don't match a model name go to `unit.equipment[]`
- "Warlord" tag appears as an indented bullet under a model
- Enhancement line: `• Enhancements: Name` (unit-level bullet)
- Footer line `Exported with App Version...` is ignored

## Tests

- `parser.test.ts` — Unit tests with synthetic army list (13 tests)
- `real-army.test.ts` — Integration tests with real Orks "Tide of muscle" army (17 tests)
