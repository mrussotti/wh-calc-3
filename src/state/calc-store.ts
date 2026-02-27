/**
 * Zustand store for damage calculator state.
 * Separate from army store to keep calculator concerns isolated.
 */
import { create } from 'zustand';
import type {
  Modifier,
  AttackerUnitConfig,
  WeaponConfig,
  WeaponSource,
  DefenderProfile,
  DefenderSource,
  DefenderStatOverrides,
  SequentialAttackResult,
  AttackContext,
  ModifierBundle,
  LeaderDefenseConfig,
} from '../calc/types.ts';
import type { PhaseMode } from '../calc/multi-attack.ts';
import type { EnrichedUnit } from '../types/enriched.ts';
import { parseWeaponKeywords } from '../calc/weapon-keywords.ts';
import { calculateSequentialAttack } from '../calc/multi-attack.ts';
import { buildDefenderFromWahapedia, buildCustomDefender } from '../calc/defender.ts';
import { buildCombinedDefensePool, flattenCombinedDefense } from '../calc/leader-defense.ts';
import { expandBundle } from '../calc/modifiers.ts';
import { useArmyStore } from './army-store.ts';

export interface CalcState {
  armyModifiers: Modifier[];
  attackerConfigs: AttackerUnitConfig[];
  defender: DefenderSource | null;
  defenderProfile: DefenderProfile | null;
  defenderLeaderIds: string[];
  defenderLeaderProfiles: DefenderProfile[];
  defenderStatOverrides: DefenderStatOverrides | null;
  phaseMode: PhaseMode;
  context: AttackContext;
  lastResult: SequentialAttackResult | null;
}

export interface CalcActions {
  addAttackerUnit: (unitInstanceId: string) => void;
  removeAttackerUnit: (unitInstanceId: string) => void;
  reorderAttackerUnits: (fromIndex: number, toIndex: number) => void;
  toggleWeapon: (unitInstanceId: string, weaponName: string, profileName: string | null) => void;
  toggleWeaponKeyword: (unitInstanceId: string, weaponName: string, profileName: string | null, keywordKey: string) => void;
  addModifier: (level: 'army' | 'unit' | 'weapon', targetId: string, modifier: Modifier) => void;
  removeModifier: (level: 'army' | 'unit' | 'weapon', targetId: string, modifierId: string) => void;
  addSourceModifier: (unitInstanceId: string, sourceId: string, modifier: Modifier) => void;
  removeSourceModifier: (unitInstanceId: string, sourceId: string, modifierId: string) => void;
  applyBundle: (bundle: ModifierBundle, targetId?: string) => void;
  removeBundle: (bundleId: string) => void;
  setDefenderFromWahapedia: (datasheetId: string, factionId: string) => void;
  setDefenderCustom: (name: string, t: number, sv: number, inv: number | null, w: number, models: number, fnp: number | null, keywords?: string[]) => void;
  addDefenderLeaderFromWahapedia: (datasheetId: string, factionId: string) => void;
  addDefenderLeaderCustom: (name: string, t: number, sv: number, inv: number | null, w: number, fnp: number | null, keywords?: string[]) => void;
  removeDefenderLeader: (index: number) => void;
  addDefenderModifier: (modifier: Modifier) => void;
  removeDefenderModifier: (modifierId: string) => void;
  setPhaseMode: (mode: PhaseMode) => void;
  setWeaponStatOverride: (unitInstanceId: string, weaponName: string, profileName: string | null, stat: string, value: string | undefined) => void;
  clearWeaponStatOverrides: (unitInstanceId: string, weaponName: string, profileName: string | null) => void;
  setDefenderStatOverride: (stat: string, value: number | null | undefined) => void;
  clearDefenderStatOverrides: () => void;
  setContext: (ctx: Partial<AttackContext>) => void;
  recalculate: () => void;
  resetCalc: () => void;
}

export type CalcStore = CalcState & CalcActions;

const initialState: CalcState = {
  armyModifiers: [],
  attackerConfigs: [],
  defender: null,
  defenderProfile: null,
  defenderLeaderIds: [],
  defenderLeaderProfiles: [],
  defenderStatOverrides: null,
  phaseMode: 'shooting',
  context: {
    halfRange: false,
    isCharging: false,
    didNotMove: false,
    targetInCover: false,
    isOverwatch: false,
  },
  lastResult: null,
};

export const useCalcStore = create<CalcStore>((set, get) => ({
  ...initialState,

  addAttackerUnit: (unitInstanceId: string) => {
    const armyState = useArmyStore.getState();
    const army = armyState.armyList;
    if (!army) return;

    const unit = army.units.find(u => u.instanceId === unitInstanceId);
    if (!unit) return;

    // If this is a paired character, redirect to the bodyguard unit
    const pairedUnitId = getPairedBodyguardUnit(unitInstanceId, armyState.leaderPairings);
    const effectiveId = pairedUnitId ?? unitInstanceId;

    // Don't add duplicates
    if (get().attackerConfigs.some(c => c.unitInstanceId === effectiveId)) return;

    const effectiveUnit = army.units.find(u => u.instanceId === effectiveId)!;
    const leaderIds = armyState.leaderPairings[effectiveId] ?? [];
    const leaders = leaderIds
      .map(id => army.units.find(u => u.instanceId === id))
      .filter((u): u is EnrichedUnit => u !== undefined);

    const config = buildAttackerConfig(effectiveUnit, leaders, get().phaseMode);
    set(state => ({
      attackerConfigs: [...state.attackerConfigs, config],
    }));
    get().recalculate();
  },

  removeAttackerUnit: (unitInstanceId: string) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.filter(c => c.unitInstanceId !== unitInstanceId),
    }));
    get().recalculate();
  },

  reorderAttackerUnits: (fromIndex: number, toIndex: number) => {
    set(state => {
      const configs = [...state.attackerConfigs];
      const [moved] = configs.splice(fromIndex, 1);
      configs.splice(toIndex, 0, moved);
      return { attackerConfigs: configs };
    });
    get().recalculate();
  },

  toggleWeapon: (unitInstanceId: string, weaponName: string, profileName: string | null) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.map(config => {
        if (config.unitInstanceId !== unitInstanceId) return config;
        return {
          ...config,
          weapons: config.weapons.map(wc => {
            if (wc.weapon.name === weaponName && wc.weapon.profileName === profileName) {
              return { ...wc, enabled: !wc.enabled };
            }
            return wc;
          }),
        };
      }),
    }));
    get().recalculate();
  },

  toggleWeaponKeyword: (unitInstanceId: string, weaponName: string, profileName: string | null, keywordKey: string) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.map(config => {
        if (config.unitInstanceId !== unitInstanceId) return config;
        return {
          ...config,
          weapons: config.weapons.map(wc => {
            if (wc.weapon.name === weaponName && wc.weapon.profileName === profileName) {
              const current = wc.keywordOverrides[keywordKey] ?? true;
              return {
                ...wc,
                keywordOverrides: { ...wc.keywordOverrides, [keywordKey]: !current },
              };
            }
            return wc;
          }),
        };
      }),
    }));
    get().recalculate();
  },

  addModifier: (level: 'army' | 'unit' | 'weapon', targetId: string, modifier: Modifier) => {
    if (level === 'army') {
      set(state => ({ armyModifiers: [...state.armyModifiers, modifier] }));
    } else if (level === 'unit') {
      set(state => ({
        attackerConfigs: state.attackerConfigs.map(config => {
          if (config.unitInstanceId !== targetId) return config;
          return { ...config, modifiers: [...config.modifiers, modifier] };
        }),
      }));
    }
    get().recalculate();
  },

  removeModifier: (level: 'army' | 'unit' | 'weapon', targetId: string, modifierId: string) => {
    if (level === 'army') {
      set(state => ({
        armyModifiers: state.armyModifiers.filter(m => m.id !== modifierId),
      }));
    } else if (level === 'unit') {
      set(state => ({
        attackerConfigs: state.attackerConfigs.map(config => {
          if (config.unitInstanceId !== targetId) return config;
          return { ...config, modifiers: config.modifiers.filter(m => m.id !== modifierId) };
        }),
      }));
    }
    get().recalculate();
  },

  addSourceModifier: (unitInstanceId: string, sourceId: string, modifier: Modifier) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.map(config => {
        if (config.unitInstanceId !== unitInstanceId) return config;
        const existing = config.sourceModifiers[sourceId] ?? [];
        return {
          ...config,
          sourceModifiers: { ...config.sourceModifiers, [sourceId]: [...existing, modifier] },
        };
      }),
    }));
    get().recalculate();
  },

  removeSourceModifier: (unitInstanceId: string, sourceId: string, modifierId: string) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.map(config => {
        if (config.unitInstanceId !== unitInstanceId) return config;
        const existing = config.sourceModifiers[sourceId] ?? [];
        return {
          ...config,
          sourceModifiers: { ...config.sourceModifiers, [sourceId]: existing.filter(m => m.id !== modifierId) },
        };
      }),
    }));
    get().recalculate();
  },

  applyBundle: (bundle: ModifierBundle) => {
    const mods = expandBundle(bundle);
    if (bundle.level === 'army') {
      set(state => ({ armyModifiers: [...state.armyModifiers, ...mods] }));
    }
    get().recalculate();
  },

  removeBundle: (bundleId: string) => {
    set(state => ({
      armyModifiers: state.armyModifiers.filter(m => m.bundleId !== bundleId),
      attackerConfigs: state.attackerConfigs.map(config => {
        const cleanedSourceMods: Record<string, Modifier[]> = {};
        for (const [sid, mods] of Object.entries(config.sourceModifiers)) {
          const filtered = mods.filter(m => m.bundleId !== bundleId);
          if (filtered.length > 0) cleanedSourceMods[sid] = filtered;
        }
        return {
          ...config,
          modifiers: config.modifiers.filter(m => m.bundleId !== bundleId),
          sourceModifiers: cleanedSourceMods,
          weapons: config.weapons.map(wc => ({
            ...wc,
            modifiers: wc.modifiers.filter(m => m.bundleId !== bundleId),
          })),
        };
      }),
    }));
    get().recalculate();
  },

  setDefenderFromWahapedia: (datasheetId: string, factionId: string) => {
    try {
      const profile = buildDefenderFromWahapedia(datasheetId);
      set({
        defender: { type: 'wahapedia', datasheetId, factionId },
        defenderProfile: profile,
        defenderLeaderProfiles: [],
      });
      get().recalculate();
    } catch {
      // Silently fail if datasheet not found
    }
  },

  setDefenderCustom: (name, t, sv, inv, w, models, fnp, keywords) => {
    const profile = buildCustomDefender(name, t, sv, inv, w, models, fnp, keywords);
    set({
      defender: { type: 'custom', profile },
      defenderProfile: profile,
      defenderLeaderProfiles: [],
    });
    get().recalculate();
  },

  addDefenderLeaderFromWahapedia: (datasheetId: string, _factionId: string) => {
    const state = get();
    if (state.defenderLeaderProfiles.length >= 2) return;
    try {
      const profile = buildDefenderFromWahapedia(datasheetId);
      // Leaders are single models
      const leaderProfile: DefenderProfile = { ...profile, modelCount: 1 };
      set({ defenderLeaderProfiles: [...state.defenderLeaderProfiles, leaderProfile] });
      get().recalculate();
    } catch {
      // Silently fail if datasheet not found
    }
  },

  addDefenderLeaderCustom: (name, t, sv, inv, w, fnp, keywords) => {
    const state = get();
    if (state.defenderLeaderProfiles.length >= 2) return;
    const profile = buildCustomDefender(name, t, sv, inv, w, 1, fnp, keywords);
    set({ defenderLeaderProfiles: [...state.defenderLeaderProfiles, profile] });
    get().recalculate();
  },

  removeDefenderLeader: (index: number) => {
    set(state => ({
      defenderLeaderProfiles: state.defenderLeaderProfiles.filter((_, i) => i !== index),
    }));
    get().recalculate();
  },

  addDefenderModifier: (modifier: Modifier) => {
    set(state => {
      if (!state.defenderProfile) return state;
      return {
        defenderProfile: {
          ...state.defenderProfile,
          modifiers: [...state.defenderProfile.modifiers, modifier],
        },
      };
    });
    get().recalculate();
  },

  removeDefenderModifier: (modifierId: string) => {
    set(state => {
      if (!state.defenderProfile) return state;
      return {
        defenderProfile: {
          ...state.defenderProfile,
          modifiers: state.defenderProfile.modifiers.filter(m => m.id !== modifierId),
        },
      };
    });
    get().recalculate();
  },

  setWeaponStatOverride: (unitInstanceId: string, weaponName: string, profileName: string | null, stat: string, value: string | undefined) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.map(config => {
        if (config.unitInstanceId !== unitInstanceId) return config;
        return {
          ...config,
          weapons: config.weapons.map(wc => {
            if (wc.weapon.name !== weaponName || wc.weapon.profileName !== profileName) return wc;
            const existing = wc.statOverrides ?? {};
            const updated = { ...existing, [stat]: value };
            // Remove undefined keys
            if (value === undefined) delete updated[stat as keyof typeof updated];
            const hasOverrides = Object.values(updated).some(v => v !== undefined);
            return { ...wc, statOverrides: hasOverrides ? updated : undefined };
          }),
        };
      }),
    }));
    get().recalculate();
  },

  clearWeaponStatOverrides: (unitInstanceId: string, weaponName: string, profileName: string | null) => {
    set(state => ({
      attackerConfigs: state.attackerConfigs.map(config => {
        if (config.unitInstanceId !== unitInstanceId) return config;
        return {
          ...config,
          weapons: config.weapons.map(wc => {
            if (wc.weapon.name !== weaponName || wc.weapon.profileName !== profileName) return wc;
            return { ...wc, statOverrides: undefined };
          }),
        };
      }),
    }));
    get().recalculate();
  },

  setDefenderStatOverride: (stat: string, value: number | null | undefined) => {
    set(state => {
      const existing = state.defenderStatOverrides ?? {};
      const updated = { ...existing, [stat]: value };
      // Remove undefined keys
      if (value === undefined) delete updated[stat as keyof typeof updated];
      const hasOverrides = Object.values(updated).some(v => v !== undefined);
      return { defenderStatOverrides: hasOverrides ? updated : null };
    });
    get().recalculate();
  },

  clearDefenderStatOverrides: () => {
    set({ defenderStatOverrides: null });
    get().recalculate();
  },

  setPhaseMode: (mode: PhaseMode) => {
    set({ phaseMode: mode });
    get().recalculate();
  },

  setContext: (ctx: Partial<AttackContext>) => {
    set(state => ({
      context: { ...state.context, ...ctx },
    }));
    get().recalculate();
  },

  recalculate: () => {
    const state = get();
    if (state.attackerConfigs.length === 0 || !state.defenderProfile) {
      set({ lastResult: null });
      return;
    }

    // Build effective defender by merging stat overrides
    let effectiveDefender = state.defenderProfile;
    if (state.defenderStatOverrides) {
      const o = state.defenderStatOverrides;
      effectiveDefender = {
        ...state.defenderProfile,
        ...(o.toughness !== undefined && { toughness: o.toughness }),
        ...(o.save !== undefined && { save: o.save }),
        ...(o.invulnerableSave !== undefined && { invulnerableSave: o.invulnerableSave }),
        ...(o.wounds !== undefined && { wounds: o.wounds }),
        ...(o.modelCount !== undefined && { modelCount: o.modelCount }),
        ...(o.feelNoPain !== undefined && { feelNoPain: o.feelNoPain }),
      };
    }

    // Materialize source modifiers into each weapon's modifiers array
    const materializedConfigs = state.attackerConfigs.map(config => {
      if (Object.keys(config.sourceModifiers).length === 0) return config;
      return {
        ...config,
        weapons: config.weapons.map(wc => {
          if (!wc.source) return wc;
          const sourceMods = config.sourceModifiers[wc.source.sourceId] ?? [];
          if (sourceMods.length === 0) return wc;
          return { ...wc, modifiers: [...wc.modifiers, ...sourceMods] };
        }),
      };
    });

    // Build leader defense config if leaders are attached
    let leaderDefenseConfig: LeaderDefenseConfig | undefined;
    if (state.defenderLeaderProfiles.length > 0) {
      const pool = buildCombinedDefensePool(effectiveDefender, state.defenderLeaderProfiles);
      const flatDefender = flattenCombinedDefense(pool);
      // Use flattened defender as base (combined toughness, keywords, etc.)
      effectiveDefender = flatDefender;
      leaderDefenseConfig = { pool, leaders: state.defenderLeaderProfiles };
    }

    const result = calculateSequentialAttack(
      materializedConfigs,
      state.armyModifiers,
      effectiveDefender,
      state.phaseMode,
      state.context,
      leaderDefenseConfig,
    );

    set({ lastResult: result });
  },

  resetCalc: () => set(initialState),
}));

/** Build an AttackerUnitConfig from an EnrichedUnit, merging any attached leaders' weapons */
function buildAttackerConfig(unit: EnrichedUnit, leaders: EnrichedUnit[], phaseMode: PhaseMode): AttackerUnitConfig {
  const sources: WeaponSource[] = [];
  const bodyguardSource: WeaponSource = {
    sourceId: unit.instanceId,
    sourceName: unit.displayName,
    isLeader: false,
  };

  if (leaders.length > 0) {
    sources.push(bodyguardSource);
  }

  const unitWeapons: WeaponConfig[] = unit.weapons.map(w => ({
    weapon: w,
    enabled: true,
    parsedKeywords: parseWeaponKeywords(w.keywords),
    keywordOverrides: {},
    modifiers: [],
    ...(leaders.length > 0 ? { source: bodyguardSource } : {}),
  }));

  // Merge leader weapons into the unit
  const leaderWeapons: WeaponConfig[] = leaders.flatMap(leader => {
    const leaderSource: WeaponSource = {
      sourceId: leader.instanceId,
      sourceName: leader.displayName,
      isLeader: true,
    };
    sources.push(leaderSource);
    return leader.weapons.map(w => ({
      weapon: w,
      enabled: true,
      parsedKeywords: parseWeaponKeywords(w.keywords),
      keywordOverrides: {},
      modifiers: [],
      source: leaderSource,
    }));
  });

  const displayName = leaders.length > 0
    ? `${unit.displayName} + ${leaders.map(l => l.displayName).join(', ')}`
    : unit.displayName;

  return {
    unitInstanceId: unit.instanceId,
    unitName: displayName,
    phase: phaseMode === 'fighting' ? 'fighting' : 'shooting',
    weapons: [...unitWeapons, ...leaderWeapons],
    modifiers: [],
    modelModifiers: {},
    sources,
    sourceModifiers: {},
  };
}

/** If this character is paired to a bodyguard unit, return the bodyguard unit's ID */
function getPairedBodyguardUnit(
  characterId: string,
  leaderPairings: Record<string, string[]>,
): string | null {
  for (const [unitId, leaders] of Object.entries(leaderPairings)) {
    if (leaders.includes(characterId)) return unitId;
  }
  return null;
}
