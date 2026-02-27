/** Build DefenderProfile from Wahapedia data or custom input */

import type { DefenderProfile } from './types.ts';
import { getDatasheet, getModels, getKeywords, getAbilities, getAbilityRef } from '../data/index.ts';
import { parseThreshold } from './dice.ts';

/**
 * Build a DefenderProfile from Wahapedia data by datasheet ID.
 * Uses the first model's stats as the primary statline.
 */
export function buildDefenderFromWahapedia(datasheetId: string): DefenderProfile {
  const datasheet = getDatasheet(datasheetId);
  if (!datasheet) {
    throw new Error(`Datasheet not found: ${datasheetId}`);
  }

  const models = getModels(datasheetId);
  const keywords = getKeywords(datasheetId);
  const abilities = getAbilities(datasheetId);

  // Use first model's stats as primary
  const primaryModel = models[0];
  if (!primaryModel) {
    throw new Error(`No models found for datasheet: ${datasheetId}`);
  }

  const toughness = parseInt(primaryModel.T, 10) || 4;
  const save = parseThreshold(primaryModel.Sv) ?? 7;
  const wounds = parseInt(primaryModel.W, 10) || 1;

  // Invulnerable save: prefer model stat, fall back to ability parsing
  const modelInvSv = primaryModel.inv_sv ? parseInt(primaryModel.inv_sv, 10) : NaN;
  const invulnSave = !isNaN(modelInvSv) ? modelInvSv : findInvulnerableSave(abilities);

  // FNP: check core ability refs (parameter field), fall back to description parsing
  const fnp = findFeelNoPainFromRefs(abilities) ?? findFeelNoPain(abilities);

  // Extract keyword strings
  const keywordNames = keywords.map(k => k.keyword);

  return {
    name: datasheet.name,
    toughness,
    save,
    invulnerableSave: invulnSave,
    wounds,
    modelCount: 1, // Default; user adjusts in UI
    feelNoPain: fnp,
    keywords: keywordNames,
    modifiers: [],
  };
}

/**
 * Build a DefenderProfile from custom user input.
 */
export function buildCustomDefender(
  name: string,
  toughness: number,
  save: number,
  invulnerableSave: number | null,
  wounds: number,
  modelCount: number,
  feelNoPain: number | null,
  keywords: string[] = [],
): DefenderProfile {
  return {
    name,
    toughness,
    save,
    invulnerableSave,
    wounds,
    modelCount,
    feelNoPain,
    keywords,
    modifiers: [],
  };
}

/** Search abilities for invulnerable save value */
function findInvulnerableSave(
  abilities: { name: string; description: string; type: string }[],
): number | null {
  for (const ability of abilities) {
    if (ability.type === 'invulnerable') {
      // Try to extract the save value from the description
      const match = /(\d+)\+\s*invulnerable/i.exec(ability.description);
      if (match) return parseInt(match[1], 10);
      // Try the other common format
      const match2 = /invulnerable.*?(\d+)\+/i.exec(ability.description);
      if (match2) return parseInt(match2[1], 10);
    }
  }
  return null;
}

/** Check core ability refs for FNP (e.g., ability_id with name "Feel No Pain" and parameter "5+") */
function findFeelNoPainFromRefs(
  abilities: { ability_id?: string; parameter?: string }[],
): number | null {
  for (const ability of abilities) {
    if (!ability.ability_id) continue;
    const ref = getAbilityRef(ability.ability_id);
    if (ref && ref.name.toLowerCase().includes('feel no pain')) {
      // Parameter field has the value, e.g., "5+"
      const param = ability.parameter ?? '';
      const match = /(\d+)\+?/.exec(param);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

/** Search abilities for Feel No Pain value */
function findFeelNoPain(
  abilities: { name: string; description: string; type: string }[],
): number | null {
  for (const ability of abilities) {
    const desc = ability.description.toLowerCase();
    if (desc.includes('feel no pain') || desc.includes('fnp')) {
      const match = /(\d+)\+/.exec(ability.description);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}
