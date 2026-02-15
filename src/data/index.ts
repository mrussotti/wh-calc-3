/**
 * Data Access Layer — typed lookup functions over the generated Wahapedia JSON.
 */
import type {
  WahapediaData,
  WahapediaFaction,
  WahapediaDetachment,
  WahapediaDatasheet,
  WahapediaModel,
  WahapediaWargear,
  WahapediaAbility,
  WahapediaKeyword,
  WahapediaEnhancement,
  WahapediaDetachmentAbility,
  WahapediaStratagem,
  WahapediaAbilityRef,
} from '../types/wahapedia.ts';
import { normalizeName } from '../parser/normalize.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _data: WahapediaData | null = null;

export async function loadWahapediaData(): Promise<WahapediaData> {
  if (_data) return _data;
  try {
    const mod = await import('./generated/wahapedia.json');
    _data = mod.default as unknown as WahapediaData;
    return _data;
  } catch {
    throw new Error(
      'Wahapedia data not found. Run "npm run fetch-data" to download it before importing an army list.'
    );
  }
}

export function getLoadedData(): WahapediaData {
  if (!_data) throw new Error('Wahapedia data not loaded. Call loadWahapediaData() first.');
  return _data;
}

/** Resolve faction name → faction_id */
export function getFactionIdByName(name: string): string | null {
  const data = getLoadedData();
  const normalized = normalizeName(name);
  for (const faction of Object.values(data.factions) as WahapediaFaction[]) {
    if (normalizeName(faction.name) === normalized) return faction.id;
  }
  return null;
}

export function getFaction(factionId: string): WahapediaFaction | null {
  return (getLoadedData().factions[factionId] as WahapediaFaction) ?? null;
}

/** Find a datasheet by faction and unit name */
export function getDatasheetByFactionAndName(factionId: string, name: string): WahapediaDatasheet | null {
  const data = getLoadedData();
  const factionIndex = data.datasheetIndex[factionId];
  if (!factionIndex) return null;
  const datasheetId = factionIndex[normalizeName(name)];
  if (!datasheetId) return null;
  return (data.datasheets[datasheetId] as WahapediaDatasheet) ?? null;
}

export function getDatasheet(datasheetId: string): WahapediaDatasheet | null {
  return (getLoadedData().datasheets[datasheetId] as WahapediaDatasheet) ?? null;
}

export function getModels(datasheetId: string): WahapediaModel[] {
  return (getLoadedData().models[datasheetId] as WahapediaModel[]) ?? [];
}

export function getWargear(datasheetId: string): WahapediaWargear[] {
  return (getLoadedData().wargear[datasheetId] as WahapediaWargear[]) ?? [];
}

export function getAbilities(datasheetId: string): WahapediaAbility[] {
  return (getLoadedData().abilities[datasheetId] as WahapediaAbility[]) ?? [];
}

export function getKeywords(datasheetId: string): WahapediaKeyword[] {
  return (getLoadedData().keywords[datasheetId] as WahapediaKeyword[]) ?? [];
}

/** Get which units this leader can attach to (returns datasheet IDs) */
export function getLeaderTargets(datasheetId: string): string[] {
  return getLoadedData().leaders[datasheetId] ?? [];
}

/** Get ability reference by ability_id */
export function getAbilityRef(abilityId: string): WahapediaAbilityRef | null {
  return (getLoadedData().abilityRefs[abilityId] as WahapediaAbilityRef) ?? null;
}

/** Find enhancements for a detachment */
export function getEnhancementsByDetachment(detachmentId: string): WahapediaEnhancement[] {
  return (getLoadedData().enhancements[detachmentId] as WahapediaEnhancement[]) ?? [];
}

/** Find enhancement by name within a faction */
export function getEnhancementByName(factionId: string, name: string): WahapediaEnhancement | null {
  const data = getLoadedData();
  const normalized = normalizeName(name);
  for (const enhs of Object.values(data.enhancements) as WahapediaEnhancement[][]) {
    for (const enh of enhs) {
      if (enh.faction_id === factionId && normalizeName(enh.name) === normalized) {
        return enh;
      }
    }
  }
  return null;
}

/** Get faction ability (army rule) */
export function getFactionAbilities(factionId: string): WahapediaAbilityRef[] {
  const data = getLoadedData();
  const results: WahapediaAbilityRef[] = [];
  for (const ref of Object.values(data.abilityRefs) as WahapediaAbilityRef[]) {
    if (ref.faction_id === factionId) results.push(ref);
  }
  return results;
}

/** Find a detachment by faction and name */
export function getDetachmentByFactionAndName(factionId: string, name: string): WahapediaDetachment | null {
  const data = getLoadedData();
  const normalized = normalizeName(name);
  for (const det of Object.values(data.detachments) as WahapediaDetachment[]) {
    if (det.faction_id === factionId && normalizeName(det.name) === normalized) return det;
  }
  return null;
}

export function getDetachment(detachmentId: string): WahapediaDetachment | null {
  return (getLoadedData().detachments[detachmentId] as WahapediaDetachment) ?? null;
}

export function getDetachmentAbilities(detachmentId: string): WahapediaDetachmentAbility[] {
  return (getLoadedData().detachmentAbilities[detachmentId] as WahapediaDetachmentAbility[]) ?? [];
}

export function getStratagemsByDetachment(detachmentId: string): WahapediaStratagem[] {
  return (getLoadedData().stratagems[detachmentId] as WahapediaStratagem[]) ?? [];
}

/** Get all datasheets for a faction */
export function getDatasheetsByFaction(factionId: string): WahapediaDatasheet[] {
  const data = getLoadedData();
  const results: WahapediaDatasheet[] = [];
  for (const ds of Object.values(data.datasheets) as WahapediaDatasheet[]) {
    if (ds.faction_id === factionId) results.push(ds);
  }
  return results;
}
