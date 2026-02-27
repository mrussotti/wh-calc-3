/** All calculator type definitions */

import type { EnrichedWeapon } from '../types/enriched.ts';

// === Dice ===

export interface DiceValue {
  count: number;   // number of dice (0 = fixed value)
  sides: number;   // 3 or 6 (ignored if count === 0)
  modifier: number; // added after roll
}

// === Weapon Keywords ===

export type ParsedWeaponKeyword =
  | { keyword: 'sustained_hits'; value: number }
  | { keyword: 'lethal_hits' }
  | { keyword: 'devastating_wounds' }
  | { keyword: 'anti'; target: string; threshold: number }
  | { keyword: 'twin_linked' }
  | { keyword: 'torrent' }
  | { keyword: 'blast' }
  | { keyword: 'heavy' }
  | { keyword: 'rapid_fire'; value: number }
  | { keyword: 'melta'; value: number }
  | { keyword: 'ignores_cover' }
  | { keyword: 'lance' }
  | { keyword: 'indirect_fire' }
  | { keyword: 'pistol' }
  | { keyword: 'assault' }
  | { keyword: 'hazardous' }
  | { keyword: 'precision' }
  | { keyword: 'extra_attacks'; value: number };

// === Modifiers ===

export type ModifierLevel = 'army' | 'unit' | 'model' | 'weapon';

export type ModifierType =
  // Offensive
  | { category: 'bs_modifier'; value: number }
  | { category: 'ws_modifier'; value: number }
  | { category: 'hit_roll_modifier'; value: number }
  | { category: 'wound_roll_modifier'; value: number }
  | { category: 'reroll_hits'; scope: 'ones' | 'all_failed' | 'all_non_crit' }
  | { category: 'reroll_wounds'; scope: 'ones' | 'all_failed' | 'all_non_crit' }
  | { category: 'ap_modifier'; value: number }
  | { category: 'strength_modifier'; value: number }
  | { category: 'attacks_modifier'; value: number }
  | { category: 'critical_hit_threshold'; value: number }
  | { category: 'critical_wound_threshold'; value: number }
  | { category: 'sustained_hits'; value: number }
  | { category: 'lethal_hits' }
  | { category: 'devastating_wounds' }
  // Defensive
  | { category: 'save_modifier'; value: number }
  | { category: 'feel_no_pain'; value: number }
  | { category: 'damage_reduction'; value: number; minimum: number }
  | { category: 'invulnerable_save_override'; value: number }
  | { category: 'hit_modifier_defense'; value: number }
  | { category: 'wound_modifier_defense'; value: number }
  | { category: 'half_damage' }
  | { category: 'reroll_saves'; scope: 'ones' | 'all_failed' };

export interface Modifier {
  id: string;
  source: string;
  level: ModifierLevel;
  type: ModifierType;
  bundleId?: string;
}

export interface ModifierBundle {
  id: string;
  name: string;
  description: string;
  side: 'attacker' | 'defender' | 'both';
  level: ModifierLevel;
  modifiers: ModifierType[];
}

export interface ResolvedModifiers {
  bsModifier: number;
  wsModifier: number;
  hitRollModifier: number;
  woundRollModifier: number;
  rerollHits: 'none' | 'ones' | 'all_failed' | 'all_non_crit';
  rerollWounds: 'none' | 'ones' | 'all_failed' | 'all_non_crit';
  apModifier: number;
  strengthModifier: number;
  attacksModifier: number;
  criticalHitThreshold: number;
  criticalWoundThreshold: number;
  sustainedHitsValue: number;
  hasLethalHits: boolean;
  hasDevastatingWounds: boolean;
}

export interface ResolvedDefensiveModifiers {
  saveModifier: number;
  feelNoPain: number | null;
  damageReduction: number;
  damageMinimum: number;
  invulnerableSave: number | null;
  hitModifier: number;
  woundModifier: number;
  halfDamage: boolean;
  rerollSaves: 'none' | 'ones' | 'all_failed';
}

// === Attack Context ===

export interface AttackContext {
  halfRange: boolean;
  isCharging: boolean;
  didNotMove: boolean;
  targetInCover: boolean;
  isOverwatch: boolean;
}

// === Weapon Source (leader sub-grouping) ===

export interface WeaponSource {
  sourceId: string;
  sourceName: string;
  isLeader: boolean;
}

// === Attacker Config ===

// === Stat Overrides ===

export interface WeaponStatOverrides {
  A?: string;
  BS_WS?: string;
  S?: string;
  AP?: string;
  D?: string;
}

export interface DefenderStatOverrides {
  toughness?: number;
  save?: number;
  invulnerableSave?: number | null;
  wounds?: number;
  modelCount?: number;
  feelNoPain?: number | null;
}

export interface WeaponConfig {
  weapon: EnrichedWeapon;
  enabled: boolean;
  parsedKeywords: ParsedWeaponKeyword[];
  keywordOverrides: Record<string, boolean>;
  modifiers: Modifier[];
  source?: WeaponSource;
  statOverrides?: WeaponStatOverrides;
}

export interface AttackerUnitConfig {
  unitInstanceId: string;
  unitName: string;
  phase: 'shooting' | 'fighting';
  weapons: WeaponConfig[];
  modifiers: Modifier[];
  modelModifiers: Record<string, Modifier[]>;
  sources: WeaponSource[];
  sourceModifiers: Record<string, Modifier[]>;
}

// === Defender ===

export interface DefenderProfile {
  name: string;
  toughness: number;
  save: number;
  invulnerableSave: number | null;
  wounds: number;
  modelCount: number;
  feelNoPain: number | null;
  keywords: string[];
  modifiers: Modifier[];
}

// === Results ===

export interface WeaponResult {
  weaponName: string;
  profileName: string | null;
  weaponCount: number;
  totalAttacks: number;
  hits: number;
  criticalHits: number;
  wounds: number;
  criticalWounds: number;
  unsavedWounds: number;
  totalDamage: number;
  damageAfterFnp: number;
  precisionDamageAfterFnp: number;
  modelsKilled: number;
  activeKeywords: ParsedWeaponKeyword[];
  activeModifiers: ResolvedModifiers;
  activeDefensiveModifiers: ResolvedDefensiveModifiers;
}

export interface UnitAttackResult {
  unitName: string;
  unitInstanceId: string;
  phase: 'shooting' | 'fighting';
  weapons: WeaponResult[];
  totalDamage: number;
  totalDamageAfterFnp: number;
  totalPrecisionDamageAfterFnp: number;
  totalModelsKilled: number;
}

export interface SequentialAttackResult {
  unitResults: UnitAttackResult[];
  defenderWoundTracker: {
    initialWoundPool: number;
    remainingWoundsAfterEachUnit: number[];
    modelsRemainingAfterEachUnit: number[];
    initialBodyguardWounds?: number;
    initialLeaderWounds?: number;
    bodyguardWoundsRemaining?: number;
    leaderWoundsRemaining?: number;
    bodyguardRemainingAfterEachUnit?: number[];
    leaderRemainingAfterEachUnit?: number[];
  };
  totalDamage: number;
  totalModelsKilled: number;
  defenderWipedOut: boolean;
}

// === Defender Source (for store) ===

export type DefenderSource =
  | { type: 'wahapedia'; datasheetId: string; factionId: string }
  | { type: 'custom'; profile: DefenderProfile };

// === Combined Defense Pool (leader defense) ===

export interface CombinedDefensePool {
  name: string;
  toughness: number;
  save: number;
  invulnerableSave: number | null;
  totalWounds: number;
  modelCount: number;
  feelNoPain: number | null;
  keywords: string[];
  bodyguardWounds: number;
  leaderWounds: number;
  bodyguardModelCount: number;
  bodyguardWoundsPerModel: number;
}

/** Configuration for leader-aware wound allocation */
export interface LeaderDefenseConfig {
  pool: CombinedDefensePool;
  leaders: DefenderProfile[];
}
