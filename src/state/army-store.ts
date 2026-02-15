/**
 * Zustand store for app state — army list, leader pairings, transport allocations.
 */
import { create } from 'zustand';
import type { ArmyStore, ViewMode } from '../types/state.ts';
import type { EnrichedArmyList, EnrichedUnit } from '../types/enriched.ts';
import { parseArmyList } from '../parser/army-list-parser.ts';
import { enrichArmyList } from '../matching/enrichment.ts';
import { loadWahapediaData } from '../data/index.ts';
import { MAX_LEADERS_PER_UNIT } from '../constants.ts';

export const useArmyStore = create<ArmyStore>((set, get) => ({
  // State
  armyList: null,
  rawText: '',
  viewMode: 'card' as ViewMode,
  expandedUnits: new Set<string>(),
  leaderPairings: {},
  transportAllocations: {},
  importError: null,
  isImporting: false,

  // Actions
  importArmyList: async (text: string) => {
    set({ isImporting: true, importError: null });
    try {
      await loadWahapediaData();
      const parsed = parseArmyList(text);
      const enriched = enrichArmyList(parsed);

      set({
        armyList: enriched,
        rawText: text,
        leaderPairings: {},
        transportAllocations: {},
        expandedUnits: new Set<string>(),
        isImporting: false,
      });
    } catch (err) {
      set({
        importError: err instanceof Error ? err.message : 'Unknown error',
        isImporting: false,
      });
    }
  },

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  toggleUnitExpanded: (unitId: string) => {
    const expanded = new Set(get().expandedUnits);
    if (expanded.has(unitId)) {
      expanded.delete(unitId);
    } else {
      expanded.add(unitId);
    }
    set({ expandedUnits: expanded });
  },

  expandAll: () => {
    const army = get().armyList;
    if (!army) return;
    set({ expandedUnits: new Set(army.units.map(u => u.instanceId)) });
  },

  collapseAll: () => {
    set({ expandedUnits: new Set() });
  },

  setLeaderPairing: (characterId: string, unitId: string | null) => {
    const state = get();
    const army = state.armyList;
    if (!army) return;

    const character = army.units.find(u => u.instanceId === characterId);
    if (!character?.leaderMapping) return;

    // Remove existing pairing for this character
    const newPairings = { ...state.leaderPairings };
    for (const [uid, leaders] of Object.entries(newPairings)) {
      newPairings[uid] = leaders.filter(l => l !== characterId);
      if (newPairings[uid].length === 0) delete newPairings[uid];
    }

    if (unitId) {
      const targetUnit = army.units.find(u => u.instanceId === unitId);
      if (!targetUnit) return;

      // Validate: can this character lead this unit?
      const canLeadNames = character.leaderMapping.canLead.map(n => n.toLowerCase());
      if (!canLeadNames.includes(targetUnit.name.toLowerCase())) return;

      // Validate: max leaders per unit
      const existingLeaders = newPairings[unitId] ?? [];
      if (existingLeaders.length >= MAX_LEADERS_PER_UNIT) return;

      // If already has 1 leader, the new one must be a secondary leader
      if (existingLeaders.length === 1) {
        const existingChar = army.units.find(u => u.instanceId === existingLeaders[0]);
        const newIsSecondary = character.leaderMapping.isSecondaryLeader;
        const existingIsSecondary = existingChar?.leaderMapping?.isSecondaryLeader ?? false;

        // At least one must be secondary
        if (!newIsSecondary && !existingIsSecondary) return;
      }

      newPairings[unitId] = [...existingLeaders, characterId];
    }

    set({ leaderPairings: newPairings });
  },

  removeLeaderPairing: (characterId: string) => {
    const state = get();
    const newPairings = { ...state.leaderPairings };
    for (const [uid, leaders] of Object.entries(newPairings)) {
      newPairings[uid] = leaders.filter(l => l !== characterId);
      if (newPairings[uid].length === 0) delete newPairings[uid];
    }
    set({ leaderPairings: newPairings });
  },

  assignToTransport: (unitId: string, transportId: string) => {
    const state = get();
    const army = state.armyList;
    if (!army) return;

    const transport = army.units.find(u => u.instanceId === transportId);
    if (!transport?.transportCapacity) return;

    const targetUnit = army.units.find(u => u.instanceId === unitId);
    if (!targetUnit) return;

    // Remove unit from any existing transport
    const newAllocations = { ...state.transportAllocations };
    for (const [tid, units] of Object.entries(newAllocations)) {
      newAllocations[tid] = units.filter(u => u !== unitId);
      if (newAllocations[tid].length === 0) delete newAllocations[tid];
    }

    // Check exclusions — match against keywords, unit name, and model names
    for (const exclusion of transport.transportCapacity.exclusions) {
      const excLower = exclusion.toLowerCase();
      const blocked =
        targetUnit.keywords.some(k => k.toLowerCase().includes(excLower)) ||
        targetUnit.name.toLowerCase().includes(excLower) ||
        targetUnit.modelStats.some(m => m.name.toLowerCase().includes(excLower));
      if (blocked) return; // Can't transport this unit
    }

    // Calculate capacity with the new unit added
    const existing = newAllocations[transportId] ?? [];
    const allUnitsInTransport = [...existing, unitId];

    const usedCapacity = calculateUsedCapacity(army, allUnitsInTransport, state.leaderPairings, transport.transportCapacity);
    if (usedCapacity > transport.transportCapacity.baseCapacity) return;

    newAllocations[transportId] = allUnitsInTransport;
    set({ transportAllocations: newAllocations });
  },

  removeFromTransport: (unitId: string) => {
    const state = get();
    const newAllocations = { ...state.transportAllocations };
    for (const [tid, units] of Object.entries(newAllocations)) {
      newAllocations[tid] = units.filter(u => u !== unitId);
      if (newAllocations[tid].length === 0) delete newAllocations[tid];
    }
    set({ transportAllocations: newAllocations });
  },

  reset: () => set({
    armyList: null,
    rawText: '',
    leaderPairings: {},
    transportAllocations: {},
    expandedUnits: new Set(),
    importError: null,
    isImporting: false,
  }),
}));

/** Calculate total model slots used in a transport */
function calculateUsedCapacity(
  army: EnrichedArmyList,
  unitIds: string[],
  leaderPairings: Record<string, string[]>,
  transportCapacity: NonNullable<EnrichedUnit['transportCapacity']>,
): number {
  let total = 0;

  for (const unitId of unitIds) {
    const unit = army.units.find(u => u.instanceId === unitId);
    if (!unit) continue;

    total += getModelSlots(unit, transportCapacity);

    // Add attached leaders
    const leaders = leaderPairings[unitId] ?? [];
    for (const leaderId of leaders) {
      const leader = army.units.find(u => u.instanceId === leaderId);
      if (leader) {
        total += getModelSlots(leader, transportCapacity);
      }
    }
  }

  return total;
}

function getModelSlots(
  unit: EnrichedUnit,
  transportCapacity: NonNullable<EnrichedUnit['transportCapacity']>,
): number {
  // Separate multipliers by type:
  // - 'model' multipliers match specific model names (e.g., "Ghazghkull Thraka")
  // - 'keyword' multipliers match unit keywords (e.g., "Mega Armour", "Jump Pack")
  const modelMultipliers = new Map(
    transportCapacity.multipliers
      .filter(m => m.matchType === 'model')
      .map(m => [m.keyword.toLowerCase(), m.slots]),
  );
  const keywordMultipliers = new Map(
    transportCapacity.multipliers
      .filter(m => m.matchType === 'keyword')
      .map(m => [m.keyword.toLowerCase(), m.slots]),
  );

  const unitKeywordsLower = unit.keywords.map(k => k.toLowerCase());

  // For each model stat line, determine its slot cost
  if (unit.modelStats.length > 0) {
    let total = 0;
    for (const model of unit.modelStats) {
      const modelNameLower = model.name.toLowerCase();

      // Check model-name multipliers first (e.g., "Ghazghkull Thraka" = 4 slots)
      let slotCost = modelMultipliers.get(modelNameLower) ?? 0;

      // Then check keyword multipliers against unit keywords (e.g., "Mega Armour" = 2 slots)
      // Only keyword-type multipliers apply here — model-name multipliers
      // should NOT match via unit keywords (Makari shouldn't get 4 slots
      // just because the unit has "Ghazghkull Thraka" as a keyword)
      if (slotCost === 0) {
        for (const kw of unitKeywordsLower) {
          const mult = keywordMultipliers.get(kw);
          if (mult && mult > slotCost) {
            slotCost = mult;
          }
        }
      }

      // Default to 1 slot per model if no multiplier matched
      if (slotCost === 0) slotCost = 1;

      const parsedCount = getModelCountForProfile(unit, model.name);
      total += parsedCount * slotCost;
    }
    return total;
  }

  // Fallback: no stat data, use raw model count
  return unit.modelCount;
}

/** Find how many models of a given profile name are in the unit */
function getModelCountForProfile(unit: EnrichedUnit, profileName: string): number {
  const key = profileName.toLowerCase();
  const count = unit.modelCountByProfile[key];
  if (count !== undefined && count > 0) return count;

  // Fallback: single stat line → all models, otherwise 1
  if (unit.modelStats.length === 1) return unit.modelCount;
  return 1;
}

// === Selectors ===

/** Imperative version — reads latest state but doesn't trigger re-renders */
export function getTransportUsedCapacity(transportId: string): number {
  const state = useArmyStore.getState();
  const army = state.armyList;
  if (!army) return 0;

  const transport = army.units.find(u => u.instanceId === transportId);
  if (!transport?.transportCapacity) return 0;

  const unitIds = state.transportAllocations[transportId] ?? [];
  return calculateUsedCapacity(army, unitIds, state.leaderPairings, transport.transportCapacity);
}

/** Reactive hook — re-renders when transport allocations or leader pairings change */
export function useTransportUsedCapacity(transportId: string): number {
  return useArmyStore(state => {
    const army = state.armyList;
    if (!army) return 0;

    const transport = army.units.find(u => u.instanceId === transportId);
    if (!transport?.transportCapacity) return 0;

    const unitIds = state.transportAllocations[transportId] ?? [];
    return calculateUsedCapacity(army, unitIds, state.leaderPairings, transport.transportCapacity);
  });
}

export function getAvailableLeaderSlots(unitId: string): number {
  const state = useArmyStore.getState();
  const leaders = state.leaderPairings[unitId] ?? [];
  if (leaders.length >= MAX_LEADERS_PER_UNIT) return 0;
  if (leaders.length === 0) return MAX_LEADERS_PER_UNIT;

  // Has 1 leader — can add a secondary
  const army = state.armyList;
  if (!army) return 0;

  const existingChar = army.units.find(u => u.instanceId === leaders[0]);
  if (existingChar?.leaderMapping?.isSecondaryLeader) {
    // Existing is secondary, so we can add a primary
    return 1;
  }
  // Existing is primary, can add secondary
  return 1;
}

export function getCharacterPairedUnit(characterId: string): string | null {
  const state = useArmyStore.getState();
  for (const [unitId, leaders] of Object.entries(state.leaderPairings)) {
    if (leaders.includes(characterId)) return unitId;
  }
  return null;
}

export function getUnitTransport(unitId: string): string | null {
  const state = useArmyStore.getState();
  for (const [transportId, units] of Object.entries(state.transportAllocations)) {
    if (units.includes(unitId)) return transportId;
  }
  return null;
}

/** Reactive hook — re-renders when leader pairings change */
export function useCharacterPairedUnit(characterId: string): string | null {
  return useArmyStore(state => {
    for (const [unitId, leaders] of Object.entries(state.leaderPairings)) {
      if (leaders.includes(characterId)) return unitId;
    }
    return null;
  });
}

/** Reactive hook — re-renders when transport allocations change */
export function useUnitTransport(unitId: string): string | null {
  return useArmyStore(state => {
    for (const [transportId, units] of Object.entries(state.transportAllocations)) {
      if (units.includes(unitId)) return transportId;
    }
    return null;
  });
}

/** Find units eligible for a character to lead */
export function getEligibleUnitsForLeader(
  armyList: EnrichedArmyList,
  character: EnrichedUnit,
): EnrichedUnit[] {
  if (!character.leaderMapping) return [];
  const canLeadNames = character.leaderMapping.canLead.map(n => n.toLowerCase());
  return armyList.units.filter(u => {
    if (u.instanceId === character.instanceId) return false;
    if (u.isCharacter && !u.transportCapacity) return false;
    return canLeadNames.includes(u.name.toLowerCase());
  });
}
