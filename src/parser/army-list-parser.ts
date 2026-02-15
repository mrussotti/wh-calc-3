/**
 * Army List Parser — converts pasted text from the official Warhammer app
 * into a structured ParsedArmyList using a line-by-line state machine.
 */
import type { ParsedArmyList, ParsedUnit, ParsedModel, ParsedWeapon, UnitRole } from '../types/army-list.ts';

type ParserState = 'header' | 'sections';

const ROLE_MAP: Record<string, UnitRole> = {
  'characters': 'characters',
  'character': 'characters',
  'battleline': 'battleline',
  'dedicated transports': 'dedicated_transports',
  'dedicated transport': 'dedicated_transports',
  'other datasheets': 'other',
  'other': 'other',
  'allied units': 'other',
};

// Match: "Army Name (2000 Points)" or "Army Name (2,000 Points)"
const ARMY_HEADER_RE = /^(.+?)\s*\((\d[\d,]*)\s*[Pp]oints?\)$/;

// Match section headers like "CHARACTERS", "BATTLELINE", etc.
const SECTION_HEADER_RE = /^([A-Z][A-Z\s]+)$/;

// Match unit line: "Unit Name (150 Points)"
const UNIT_RE = /^(.+?)\s*\((\d+)\s*[Pp]oints?\)$/;

// Match model line: "• 1x Model Name" or "• Model Name"
const MODEL_RE = /^\u2022\s+(?:(\d+)x\s+)?(.+)$/;

// Match weapon line: "◦ 1x Weapon Name" or "◦ Weapon Name"
const WEAPON_RE = /^\u25E6\s+(?:(\d+)x\s+)?(.+)$/;

// Match enhancement: "• Enhancements: Enhancement Name"
const ENHANCEMENT_RE = /^\u2022\s+Enhancements?:\s*(.+)$/;

// Match warlord marker
const WARLORD_RE = /^\u2022\s+Warlord$/i;

// Footer line to ignore
const FOOTER_RE = /^Exported with App Version/i;

let unitIdCounter = 0;

function nextUnitId(): string {
  return `unit_${++unitIdCounter}`;
}

export function parseArmyList(text: string): ParsedArmyList {
  unitIdCounter = 0;

  const lines = text.split(/\r?\n/);
  let state: ParserState = 'header';
  let headerLine = 0;

  const result: ParsedArmyList = {
    armyName: '',
    faction: '',
    detachment: '',
    gameSize: '',
    totalPoints: 0,
    units: [],
  };

  let currentRole: UnitRole = 'other';
  let currentUnit: ParsedUnit | null = null;
  let currentModel: ParsedModel | null = null;

  function finalizeUnit() {
    if (currentUnit) {
      // Finalize last model
      finalizeModel();
      result.units.push(currentUnit);
      currentUnit = null;
    }
  }

  function finalizeModel() {
    if (currentModel && currentUnit) {
      currentUnit.models.push(currentModel);
      currentModel = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '' || FOOTER_RE.test(line)) continue;

    if (state === 'header') {
      headerLine++;
      if (headerLine === 1) {
        const match = ARMY_HEADER_RE.exec(line);
        if (match) {
          result.armyName = match[1].trim();
          result.totalPoints = parseInt(match[2].replace(/,/g, ''), 10);
        } else {
          result.armyName = line;
        }
      } else if (headerLine === 2) {
        result.faction = line;
      } else if (headerLine === 3) {
        result.detachment = line;
      } else if (headerLine === 4) {
        result.gameSize = line;
        state = 'sections';
      }
      continue;
    }

    // Check for section header
    if (SECTION_HEADER_RE.test(line)) {
      const sectionName = line.toLowerCase().trim();
      if (sectionName in ROLE_MAP) {
        finalizeUnit();
        currentRole = ROLE_MAP[sectionName];
        continue;
      }
    }

    // Check for unit line
    const unitMatch = UNIT_RE.exec(line);
    if (unitMatch && !line.startsWith('\u2022') && !line.startsWith('\u25E6')) {
      finalizeUnit();
      currentUnit = {
        id: nextUnitId(),
        name: unitMatch[1].trim(),
        role: currentRole,
        points: parseInt(unitMatch[2], 10),
        isWarlord: false,
        enhancement: null,
        models: [],
        equipment: [],
      };
      continue;
    }

    // Check for enhancement
    const enhancementMatch = ENHANCEMENT_RE.exec(line);
    if (enhancementMatch && currentUnit) {
      currentUnit.enhancement = enhancementMatch[1].trim();
      continue;
    }

    // Check for warlord marker
    if (WARLORD_RE.test(line) && currentUnit) {
      currentUnit.isWarlord = true;
      continue;
    }

    // Check for weapon line (sub-bullet under model)
    const weaponMatch = WEAPON_RE.exec(line);
    if (weaponMatch && currentModel) {
      const weapon: ParsedWeapon = {
        name: weaponMatch[2].trim(),
        count: weaponMatch[1] ? parseInt(weaponMatch[1], 10) : 1,
      };
      currentModel.weapons.push(weapon);
      continue;
    }

    // Check for model line (bullet)
    const modelMatch = MODEL_RE.exec(line);
    if (modelMatch && currentUnit) {
      finalizeModel();
      const name = modelMatch[2].trim();

      // Check if this is equipment (no sub-weapons will follow, it's a single bullet item)
      // We'll detect this heuristically: if it looks like a model name (or we find
      // sub-bullets later), treat it as a model. Equipment items are standalone bullets.
      currentModel = {
        name,
        count: modelMatch[1] ? parseInt(modelMatch[1], 10) : 1,
        weapons: [],
        isSubModel: false,
      };
      continue;
    }
  }

  // Finalize last unit
  finalizeUnit();

  // Post-process: detect flat weapon lists vs model groupings
  for (const unit of result.units) {
    const modelsWithWeapons = unit.models.filter(m => m.weapons.length > 0);
    const modelsWithoutWeapons = unit.models.filter(m => m.weapons.length === 0);

    if (modelsWithWeapons.length === 0 && modelsWithoutWeapons.length > 0) {
      // ALL items are flat bullets with no sub-weapons.
      // This is a "flat weapon list" format — the bullets are weapons/equipment,
      // not models. Create a single implicit model named after the unit.
      const implicitModel: ParsedModel = {
        name: unit.name,
        count: 1,
        weapons: [],
        isSubModel: false,
      };
      for (const m of modelsWithoutWeapons) {
        implicitModel.weapons.push({ name: m.name, count: m.count });
      }
      unit.models = [implicitModel];
    } else if (modelsWithWeapons.length > 0 && modelsWithoutWeapons.length > 0) {
      // Mixed: some models have sub-weapons, some don't.
      // Models without weapons that aren't the same type as models with weapons
      // are equipment (e.g., 'Ard Case on Battlewagon).
      const primaryModelNames = new Set(modelsWithWeapons.map(m => m.name));
      const newModels: ParsedModel[] = [...modelsWithWeapons];

      for (const m of modelsWithoutWeapons) {
        if (primaryModelNames.has(m.name)) {
          newModels.push(m);
        } else {
          // It's equipment
          for (let i = 0; i < m.count; i++) {
            unit.equipment.push(m.name);
          }
        }
      }

      unit.models = newModels;
    }
  }

  return result;
}
