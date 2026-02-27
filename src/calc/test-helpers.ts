/** Shared test fixtures for calculator tests */

import type {
  WeaponConfig,
  DefenderProfile,
  AttackerUnitConfig,
  AttackContext,
  Modifier,
  ResolvedModifiers,
  ResolvedDefensiveModifiers,
} from './types.ts';
import type { EnrichedWeapon } from '../types/enriched.ts';
import { parseWeaponKeywords } from './weapon-keywords.ts';

/** Build a minimal EnrichedWeapon with defaults */
export function makeWeapon(overrides: Partial<EnrichedWeapon> & { name: string }): EnrichedWeapon {
  return {
    profileName: null,
    count: 1,
    range: '24"',
    type: 'ranged',
    A: '1',
    BS_WS: '3+',
    S: '4',
    AP: '0',
    D: '1',
    keywords: '',
    ...overrides,
  };
}

/** Build a WeaponConfig from a weapon with all keywords enabled */
export function makeWeaponConfig(
  weapon: EnrichedWeapon,
  overrides?: Partial<WeaponConfig>,
): WeaponConfig {
  return {
    weapon,
    enabled: true,
    parsedKeywords: parseWeaponKeywords(weapon.keywords),
    keywordOverrides: {},
    modifiers: [],
    ...overrides,
  };
}

/** Build a minimal DefenderProfile */
export function makeDefender(overrides?: Partial<DefenderProfile>): DefenderProfile {
  return {
    name: 'Test Target',
    toughness: 4,
    save: 3,
    invulnerableSave: null,
    wounds: 2,
    modelCount: 5,
    feelNoPain: null,
    keywords: ['Infantry'],
    modifiers: [],
    ...overrides,
  };
}

/** Build a minimal AttackerUnitConfig */
export function makeAttackerConfig(
  overrides?: Partial<AttackerUnitConfig>,
): AttackerUnitConfig {
  return {
    unitInstanceId: 'unit-1',
    unitName: 'Test Unit',
    phase: 'shooting',
    weapons: [],
    modifiers: [],
    modelModifiers: {},
    sources: [],
    sourceModifiers: {},
    ...overrides,
  };
}

/** Build a default AttackContext */
export function makeContext(overrides?: Partial<AttackContext>): AttackContext {
  return {
    halfRange: false,
    isCharging: false,
    didNotMove: false,
    targetInCover: false,
    isOverwatch: false,
    ...overrides,
  };
}

/** Build a default ResolvedModifiers */
export function makeResolvedMods(overrides?: Partial<ResolvedModifiers>): ResolvedModifiers {
  return {
    bsModifier: 0,
    wsModifier: 0,
    hitRollModifier: 0,
    woundRollModifier: 0,
    rerollHits: 'none',
    rerollWounds: 'none',
    apModifier: 0,
    strengthModifier: 0,
    attacksModifier: 0,
    criticalHitThreshold: 6,
    criticalWoundThreshold: 6,
    sustainedHitsValue: 0,
    hasLethalHits: false,
    hasDevastatingWounds: false,
    ...overrides,
  };
}

/** Build a default ResolvedDefensiveModifiers */
export function makeResolvedDefMods(overrides?: Partial<ResolvedDefensiveModifiers>): ResolvedDefensiveModifiers {
  return {
    saveModifier: 0,
    feelNoPain: null,
    damageReduction: 0,
    damageMinimum: 1,
    invulnerableSave: null,
    hitModifier: 0,
    woundModifier: 0,
    halfDamage: false,
    rerollSaves: 'none',
    ...overrides,
  };
}

/** Create a simple Modifier object */
export function makeMod(
  category: string,
  value: number,
  level: 'army' | 'unit' | 'model' | 'weapon' = 'army',
): Modifier {
  return {
    id: `test-${category}-${value}`,
    source: `test ${category}`,
    level,
    type: { category, value } as Modifier['type'],
  };
}
