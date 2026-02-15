/**
 * Enrichment engine — merges parsed army list data with Wahapedia stats.
 */
import type { ParsedArmyList, ParsedUnit, ParsedModel } from '../types/army-list.ts';
import type {
  EnrichedArmyList,
  EnrichedUnit,
  EnrichedWeapon,
  ModelStats,
  UnitAbility,
  TransportCapacity,
  LeaderMapping,
  FactionAbility,
  DetachmentInfo,
} from '../types/enriched.ts';
import {
  getModels,
  getWargear,
  getAbilities,
  getKeywords,
  getLeaderTargets,
  getAbilityRef,
  getFactionAbilities,
  getDetachmentAbilities,
  getStratagemsByDetachment,
  getEnhancementsByDetachment,
  getDatasheet,
  getFaction,
} from '../data/index.ts';
import { matchFactionId, matchDatasheet, matchDetachment, matchEnhancement } from './name-matcher.ts';
import { matchWeapons } from './weapon-matcher.ts';
import { isSecondaryLeader } from './leader-classifier.ts';
import { stripHtml } from '../parser/normalize.ts';

export function enrichArmyList(parsed: ParsedArmyList): EnrichedArmyList {
  const factionId = matchFactionId(parsed.faction);
  const factionName = factionId ? (getFaction(factionId)?.name ?? parsed.faction) : parsed.faction;

  // Resolve detachment
  let detachment: DetachmentInfo | null = null;
  if (factionId) {
    const det = matchDetachment(factionId, parsed.detachment);
    if (det) {
      const detAbilities = getDetachmentAbilities(det.id);
      const stratagems = getStratagemsByDetachment(det.id);
      const enhancements = getEnhancementsByDetachment(det.id);

      detachment = {
        detachmentId: det.id,
        name: det.name,
        ability: detAbilities.length > 0 ? {
          name: detAbilities[0].name,
          description: stripHtml(detAbilities[0].description),
        } : null,
        stratagems: stratagems.map(s => ({
          name: s.name,
          type: s.type,
          cpCost: s.cp_cost,
          description: stripHtml(s.description),
          phase: s.phase,
          turn: s.turn,
        })),
        enhancements: enhancements.map(e => ({
          name: e.name,
          description: stripHtml(e.description),
          cost: e.cost,
        })),
      };
    }
  }

  // Resolve faction ability (army rule)
  let factionAbility: FactionAbility | null = null;
  if (factionId) {
    const factionAbilities = getFactionAbilities(factionId);
    if (factionAbilities.length > 0) {
      factionAbility = {
        name: factionAbilities[0].name,
        description: stripHtml(factionAbilities[0].description),
      };
    }
  }

  // Enrich units
  const enrichedUnits = enrichUnits(parsed.units, factionId);

  return {
    armyName: parsed.armyName,
    factionId: factionId ?? '',
    factionName,
    detachment,
    factionAbility,
    gameSize: parsed.gameSize,
    totalPoints: parsed.totalPoints,
    units: enrichedUnits,
  };
}

function enrichUnits(units: ParsedUnit[], factionId: string | null): EnrichedUnit[] {
  // Track duplicate names for display naming
  const nameCounts: Record<string, number> = {};
  for (const u of units) {
    nameCounts[u.name] = (nameCounts[u.name] ?? 0) + 1;
  }
  const nameCounters: Record<string, number> = {};

  return units.map(unit => enrichUnit(unit, factionId, nameCounts, nameCounters));
}

function enrichUnit(
  unit: ParsedUnit,
  factionId: string | null,
  nameCounts: Record<string, number>,
  nameCounters: Record<string, number>,
): EnrichedUnit {
  const warnings: string[] = [];

  // Generate display name for duplicates
  let displayName = unit.name;
  if (nameCounts[unit.name] > 1) {
    nameCounters[unit.name] = (nameCounters[unit.name] ?? 0) + 1;
    displayName = `${unit.name} #${nameCounters[unit.name]}`;
  }

  // Match datasheet
  const ds = factionId ? matchDatasheet(factionId, unit.name) : null;
  if (!ds && factionId) {
    warnings.push(`Could not match unit "${unit.name}" to a Wahapedia datasheet`);
  }

  const datasheetId = ds?.id ?? null;

  // Get model stats
  const modelStats: ModelStats[] = datasheetId
    ? getModels(datasheetId).map(m => ({
        name: m.name,
        M: m.M,
        T: m.T,
        Sv: m.Sv,
        invSv: m.inv_sv ? `${m.inv_sv}+` : '-',
        W: m.W,
        Ld: `${m.Ld}+`,
        OC: m.OC,
      }))
    : [];

  // Match weapons — collect all weapons from all models
  const allParsedWeapons = unit.models.flatMap(m => m.weapons);
  const wargearList = datasheetId ? getWargear(datasheetId) : [];
  const weapons: EnrichedWeapon[] = matchWeapons(allParsedWeapons, wargearList);

  // Separate unmatched weapons into equipment vs real warnings
  const matchedWeapons: EnrichedWeapon[] = [];
  const equipment: string[] = [...unit.equipment];
  for (const w of weapons) {
    if (w.A === '-' && w.S === '-') {
      // Unmatched — treat as equipment (e.g., 'Ard Case, Tracks and wheels)
      equipment.push(w.name);
    } else {
      matchedWeapons.push(w);
    }
  }

  // Get abilities
  const abilities: UnitAbility[] = [];
  if (datasheetId) {
    const rawAbilities = getAbilities(datasheetId);
    for (const ab of rawAbilities) {
      let name = ab.name;
      let description = ab.description;
      const type = ab.type?.toLowerCase() ?? 'other';

      // For core/faction abilities, look up by ability_id
      if (ab.ability_id && (!name || !description)) {
        const ref = getAbilityRef(ab.ability_id);
        if (ref) {
          name = name || ref.name;
          description = description || ref.description;
        }
      }

      if (name) {
        let abilityType: UnitAbility['type'] = 'datasheet';
        if (type === 'core') abilityType = 'core';
        else if (type === 'faction') abilityType = 'faction';
        else if (type === 'invulnerable' || type === 'invul') abilityType = 'invulnerable';

        abilities.push({
          name,
          description: stripHtml(description || ''),
          type: abilityType,
        });
      }
    }
  }

  // Enhancement
  let enrichedEnhancement: EnrichedUnit['enhancement'] = null;
  if (unit.enhancement && factionId) {
    const enh = matchEnhancement(factionId, unit.enhancement);
    if (enh) {
      enrichedEnhancement = {
        name: enh.name,
        description: stripHtml(enh.description),
      };
    } else {
      enrichedEnhancement = { name: unit.enhancement, description: '' };
      warnings.push(`Could not match enhancement "${unit.enhancement}"`);
    }
  }

  // Keywords
  const keywordsRaw = datasheetId ? getKeywords(datasheetId) : [];
  const keywords = keywordsRaw
    .filter(k => k.is_faction_keyword !== 'true')
    .map(k => k.keyword);
  const factionKeywords = keywordsRaw
    .filter(k => k.is_faction_keyword === 'true')
    .map(k => k.keyword);

  // Character detection
  const isCharacter = unit.role === 'characters' || keywords.includes('Character');

  // Leader mapping
  let leaderMapping: LeaderMapping | null = null;
  if (isCharacter && datasheetId) {
    const targetIds = getLeaderTargets(datasheetId);
    if (targetIds.length > 0) {
      const canLead = targetIds
        .map(id => getDatasheet(id)?.name ?? '')
        .filter(n => n !== '');

      leaderMapping = {
        canLead,
        isSecondaryLeader: isSecondaryLeader(datasheetId),
      };
    }
  }

  // Transport capacity
  let transportCapacity: TransportCapacity | null = null;
  if (ds?.transport) {
    transportCapacity = parseTransportCapacity(ds.transport);
  }

  // Count total models
  const modelCount = unit.models.reduce((sum, m) => sum + m.count, 0);

  // Build per-profile model counts by matching Wahapedia stat names to parsed models
  const modelCountByProfile = buildModelCountByProfile(modelStats, unit.models, modelCount);

  return {
    instanceId: unit.id,
    displayName,
    name: unit.name,
    datasheetId,
    role: unit.role,
    points: unit.points,
    isWarlord: unit.isWarlord,
    enhancement: enrichedEnhancement,
    equipment,
    modelStats,
    weapons: matchedWeapons,
    abilities,
    keywords,
    factionKeywords,
    isCharacter,
    leaderMapping,
    transportCapacity,
    modelCount,
    modelCountByProfile,
    matchWarnings: warnings,
  };
}

/**
 * Match Wahapedia stat profile names to parsed model counts.
 * E.g., Boyz: "BOY" → 9, "BOSS NOB" → 1
 * E.g., Ghazghkull: "GHAZGHKULL THRAKA" → 1, "MAKARI" → 1
 */
function buildModelCountByProfile(
  modelStats: ModelStats[],
  parsedModels: ParsedModel[],
  modelCount: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (modelStats.length === 0) return result;

  if (modelStats.length === 1) {
    result[modelStats[0].name.toLowerCase()] = modelCount;
    return result;
  }

  // Try to match each Wahapedia profile name to a parsed model
  let matchedSum = 0;
  const unmatched: string[] = [];

  for (const stat of modelStats) {
    const statLower = stat.name.toLowerCase();
    const parsed = parsedModels.find(m => m.name.toLowerCase() === statLower);
    if (parsed) {
      result[statLower] = parsed.count;
      matchedSum += parsed.count;
    } else {
      unmatched.push(statLower);
    }
  }

  // Distribute remaining models among unmatched profiles
  if (unmatched.length > 0) {
    const remaining = Math.max(modelCount - matchedSum, unmatched.length);
    const perUnmatched = Math.max(Math.floor(remaining / unmatched.length), 1);
    for (const name of unmatched) {
      result[name] = perUnmatched;
    }
  }

  return result;
}

export function parseTransportCapacity(transportText: string): TransportCapacity | null {
  const text = stripHtml(transportText);
  if (!text) return null;

  // Extract base capacity: "transport capacity of N"
  const capacityMatch = /transport capacity of (\d+)/i.exec(text);
  if (!capacityMatch) return null;

  const baseCapacity = parseInt(capacityMatch[1], 10);

  const multipliers: TransportCapacity['multipliers'] = [];

  // Pattern 1: "Each X or Y model takes up the space of N models"
  // e.g., "Each Mega Armour or Jump Pack model takes up the space of 2 models"
  const eachOrRe = /each\s+(.+?)\s+models?\s+takes?\s+up\s+the\s+space\s+of\s+(\d+)\s+models?/gi;
  let eachMatch;
  while ((eachMatch = eachOrRe.exec(text)) !== null) {
    const slots = parseInt(eachMatch[2], 10);
    // Split "Mega Armour or Jump Pack" into individual keywords
    const names = eachMatch[1].split(/\s+or\s+/i);
    for (const name of names) {
      multipliers.push({ keyword: name.trim(), slots, matchType: 'keyword' });
    }
  }

  // Pattern 2: "The X model takes up the space of N models" (specific model name)
  // e.g., "The Ghazghkull Thraka model takes up the space of 4 models"
  // Anchored after sentence boundary (period+space or start of string)
  const theModelRe = /(?:^|[.!]\s+)the\s+(.+?)\s+model\s+takes?\s+up\s+the\s+space\s+of\s+(\d+)\s+models?/gi;
  let theMatch;
  while ((theMatch = theModelRe.exec(text)) !== null) {
    const keyword = theMatch[1].trim();
    const slots = parseInt(theMatch[2], 10);
    // Avoid duplicates from pattern 1
    if (!multipliers.some(m => m.keyword.toLowerCase() === keyword.toLowerCase())) {
      multipliers.push({ keyword, slots, matchType: 'model' });
    }
  }

  // Extract exclusion rules: "cannot transport X models"
  // e.g., "cannot transport Jump Pack or Ghazghkull Thraka models"
  const exclusions: string[] = [];
  const exclusionRe = /cannot\s+transport\s+(.+?)\s+models/gi;
  let eMatch;
  while ((eMatch = exclusionRe.exec(text)) !== null) {
    // Split "Jump Pack or Ghazghkull Thraka" into individual exclusions
    const names = eMatch[1].split(/\s+or\s+/i);
    for (const name of names) {
      exclusions.push(name.trim());
    }
  }

  return {
    baseCapacity,
    rawText: text,
    multipliers,
    exclusions,
  };
}
