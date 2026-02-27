/** Cascading modifier resolution */

import type {
  Modifier,
  ModifierType,
  ModifierLevel,
  ModifierBundle,
  ResolvedModifiers,
  ResolvedDefensiveModifiers,
  ParsedWeaponKeyword,
  AttackContext,
} from './types.ts';
import { isKeywordActive } from './weapon-keywords.ts';

let _nextId = 1;
function nextId(): string {
  return `mod-${_nextId++}`;
}

/**
 * Resolve offensive modifiers by collecting all levels (army, unit, model, weapon)
 * and merging them into a flat ResolvedModifiers.
 */
export function resolveOffensiveModifiers(
  armyModifiers: Modifier[],
  unitModifiers: Modifier[],
  modelModifiers: Modifier[],
  weaponModifiers: Modifier[],
  activeKeywords: ParsedWeaponKeyword[],
  context: AttackContext,
): ResolvedModifiers {
  const allModifiers = [
    ...armyModifiers,
    ...unitModifiers,
    ...modelModifiers,
    ...weaponModifiers,
  ];

  const result: ResolvedModifiers = {
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
  };

  // Apply explicit modifiers
  for (const mod of allModifiers) {
    applyOffensiveModifier(result, mod.type);
  }

  // Apply keyword effects
  for (const kw of activeKeywords) {
    switch (kw.keyword) {
      case 'heavy':
        if (context.didNotMove) result.hitRollModifier += 1;
        break;
      case 'lance':
        if (context.isCharging) result.woundRollModifier += 1;
        break;
      case 'twin_linked':
        result.rerollWounds = upgradeReroll(result.rerollWounds, 'all_failed');
        break;
      case 'sustained_hits':
        result.sustainedHitsValue = Math.max(result.sustainedHitsValue, kw.value);
        break;
      case 'lethal_hits':
        result.hasLethalHits = true;
        break;
      case 'devastating_wounds':
        result.hasDevastatingWounds = true;
        break;
    }
  }

  // Clamp hit/wound modifiers to +1/-1 per 10th edition rules
  result.hitRollModifier = clamp(result.hitRollModifier, -1, 1);
  result.woundRollModifier = clamp(result.woundRollModifier, -1, 1);

  // Clamp critical thresholds (min 2, max 6)
  result.criticalHitThreshold = clamp(result.criticalHitThreshold, 2, 6);
  result.criticalWoundThreshold = clamp(result.criticalWoundThreshold, 2, 6);

  return result;
}

function applyOffensiveModifier(result: ResolvedModifiers, type: ModifierType): void {
  switch (type.category) {
    case 'bs_modifier':
      result.bsModifier += type.value;
      break;
    case 'ws_modifier':
      result.wsModifier += type.value;
      break;
    case 'hit_roll_modifier':
      result.hitRollModifier += type.value;
      break;
    case 'wound_roll_modifier':
      result.woundRollModifier += type.value;
      break;
    case 'reroll_hits':
      result.rerollHits = upgradeReroll(result.rerollHits, type.scope);
      break;
    case 'reroll_wounds':
      result.rerollWounds = upgradeReroll(result.rerollWounds, type.scope);
      break;
    case 'ap_modifier':
      result.apModifier += type.value;
      break;
    case 'strength_modifier':
      result.strengthModifier += type.value;
      break;
    case 'attacks_modifier':
      result.attacksModifier += type.value;
      break;
    case 'critical_hit_threshold':
      result.criticalHitThreshold = Math.min(result.criticalHitThreshold, type.value);
      break;
    case 'critical_wound_threshold':
      result.criticalWoundThreshold = Math.min(result.criticalWoundThreshold, type.value);
      break;
    case 'sustained_hits':
      result.sustainedHitsValue = Math.max(result.sustainedHitsValue, type.value);
      break;
    case 'lethal_hits':
      result.hasLethalHits = true;
      break;
    case 'devastating_wounds':
      result.hasDevastatingWounds = true;
      break;
  }
}

/** Resolve defensive modifiers into flat structure */
export function resolveDefensiveModifiers(modifiers: Modifier[]): ResolvedDefensiveModifiers {
  const result: ResolvedDefensiveModifiers = {
    saveModifier: 0,
    feelNoPain: null,
    damageReduction: 0,
    damageMinimum: 1,
    invulnerableSave: null,
    hitModifier: 0,
    woundModifier: 0,
    halfDamage: false,
    rerollSaves: 'none',
  };

  for (const mod of modifiers) {
    switch (mod.type.category) {
      case 'save_modifier':
        result.saveModifier += mod.type.value;
        break;
      case 'feel_no_pain':
        // Take the best (lowest) FNP
        if (result.feelNoPain === null || mod.type.value < result.feelNoPain) {
          result.feelNoPain = mod.type.value;
        }
        break;
      case 'damage_reduction':
        result.damageReduction += mod.type.value;
        result.damageMinimum = Math.max(result.damageMinimum, mod.type.minimum);
        break;
      case 'invulnerable_save_override':
        // Take the best (lowest) invuln
        if (result.invulnerableSave === null || mod.type.value < result.invulnerableSave) {
          result.invulnerableSave = mod.type.value;
        }
        break;
      case 'hit_modifier_defense':
        result.hitModifier += mod.type.value;
        break;
      case 'wound_modifier_defense':
        result.woundModifier += mod.type.value;
        break;
      case 'half_damage':
        result.halfDamage = true;
        break;
      case 'reroll_saves':
        result.rerollSaves = upgradeReroll(result.rerollSaves, mod.type.scope);
        break;
    }
  }

  return result;
}

/** Upgrade reroll: all_non_crit > all_failed > ones */
function upgradeReroll(
  current: 'none' | 'ones' | 'all_failed' | 'all_non_crit',
  incoming: 'ones' | 'all_failed' | 'all_non_crit',
): 'none' | 'ones' | 'all_failed' | 'all_non_crit';
function upgradeReroll(
  current: 'none' | 'ones' | 'all_failed',
  incoming: 'ones' | 'all_failed',
): 'none' | 'ones' | 'all_failed';
function upgradeReroll(
  current: string,
  incoming: string,
): string {
  // Fish for crits is an explicit strategic choice — takes priority
  if (current === 'all_non_crit' || incoming === 'all_non_crit') return 'all_non_crit';
  if (current === 'all_failed' || incoming === 'all_failed') return 'all_failed';
  if (current === 'ones' || incoming === 'ones') return 'ones';
  return 'none';
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Common modifier presets for quick-add UI toggles */
export type CommonModifierPreset =
  | 'plus_one_hit' | 'minus_one_hit'
  | 'plus_one_wound' | 'minus_one_wound'
  | 'plus_one_bs' | 'minus_one_bs'
  | 'plus_one_ws' | 'minus_one_ws'
  | 'reroll_ones_hit' | 'reroll_all_hit' | 'reroll_fish_hit'
  | 'reroll_ones_wound' | 'reroll_all_wound' | 'reroll_fish_wound'
  | 'plus_one_ap' | 'plus_one_strength'
  | 'plus_one_attacks' | 'minus_one_attacks'
  | 'crit_hit_5' | 'crit_wound_5'
  | 'cover' | 'fnp_6' | 'fnp_5' | 'fnp_4'
  | 'minus_one_damage'
  | 'minus_one_hit_def' | 'minus_one_wound_def'
  | 'half_damage'
  | 'reroll_ones_save' | 'reroll_all_save'
  | 'sustained_hits_1' | 'sustained_hits_2' | 'lethal_hits' | 'devastating_wounds';

export function createCommonModifier(
  preset: CommonModifierPreset,
  level: ModifierLevel,
  source: string,
): Modifier {
  const id = nextId();
  switch (preset) {
    case 'plus_one_hit':
      return { id, source, level, type: { category: 'hit_roll_modifier', value: 1 } };
    case 'minus_one_hit':
      return { id, source, level, type: { category: 'hit_roll_modifier', value: -1 } };
    case 'plus_one_bs':
      return { id, source, level, type: { category: 'bs_modifier', value: 1 } };
    case 'minus_one_bs':
      return { id, source, level, type: { category: 'bs_modifier', value: -1 } };
    case 'plus_one_ws':
      return { id, source, level, type: { category: 'ws_modifier', value: 1 } };
    case 'minus_one_ws':
      return { id, source, level, type: { category: 'ws_modifier', value: -1 } };
    case 'plus_one_wound':
      return { id, source, level, type: { category: 'wound_roll_modifier', value: 1 } };
    case 'minus_one_wound':
      return { id, source, level, type: { category: 'wound_roll_modifier', value: -1 } };
    case 'reroll_ones_hit':
      return { id, source, level, type: { category: 'reroll_hits', scope: 'ones' } };
    case 'reroll_all_hit':
      return { id, source, level, type: { category: 'reroll_hits', scope: 'all_failed' } };
    case 'reroll_fish_hit':
      return { id, source, level, type: { category: 'reroll_hits', scope: 'all_non_crit' } };
    case 'reroll_ones_wound':
      return { id, source, level, type: { category: 'reroll_wounds', scope: 'ones' } };
    case 'reroll_all_wound':
      return { id, source, level, type: { category: 'reroll_wounds', scope: 'all_failed' } };
    case 'reroll_fish_wound':
      return { id, source, level, type: { category: 'reroll_wounds', scope: 'all_non_crit' } };
    case 'plus_one_ap':
      return { id, source, level, type: { category: 'ap_modifier', value: 1 } };
    case 'plus_one_strength':
      return { id, source, level, type: { category: 'strength_modifier', value: 1 } };
    case 'cover':
      return { id, source, level, type: { category: 'save_modifier', value: 1 } };
    case 'fnp_6':
      return { id, source, level, type: { category: 'feel_no_pain', value: 6 } };
    case 'fnp_5':
      return { id, source, level, type: { category: 'feel_no_pain', value: 5 } };
    case 'fnp_4':
      return { id, source, level, type: { category: 'feel_no_pain', value: 4 } };
    case 'minus_one_damage':
      return { id, source, level, type: { category: 'damage_reduction', value: 1, minimum: 1 } };
    case 'plus_one_attacks':
      return { id, source, level, type: { category: 'attacks_modifier', value: 1 } };
    case 'minus_one_attacks':
      return { id, source, level, type: { category: 'attacks_modifier', value: -1 } };
    case 'crit_hit_5':
      return { id, source, level, type: { category: 'critical_hit_threshold', value: 5 } };
    case 'crit_wound_5':
      return { id, source, level, type: { category: 'critical_wound_threshold', value: 5 } };
    case 'minus_one_hit_def':
      return { id, source, level, type: { category: 'hit_modifier_defense', value: -1 } };
    case 'minus_one_wound_def':
      return { id, source, level, type: { category: 'wound_modifier_defense', value: -1 } };
    case 'half_damage':
      return { id, source, level, type: { category: 'half_damage' } };
    case 'reroll_ones_save':
      return { id, source, level, type: { category: 'reroll_saves', scope: 'ones' } };
    case 'reroll_all_save':
      return { id, source, level, type: { category: 'reroll_saves', scope: 'all_failed' } };
    case 'sustained_hits_1':
      return { id, source, level, type: { category: 'sustained_hits', value: 1 } };
    case 'sustained_hits_2':
      return { id, source, level, type: { category: 'sustained_hits', value: 2 } };
    case 'lethal_hits':
      return { id, source, level, type: { category: 'lethal_hits' } };
    case 'devastating_wounds':
      return { id, source, level, type: { category: 'devastating_wounds' } };
  }
}

/** Expand a ModifierBundle into individual Modifier objects sharing a bundleId */
export function expandBundle(bundle: ModifierBundle, _targetId?: string): Modifier[] {
  return bundle.modifiers.map((type, i) => ({
    id: `${bundle.id}-${i}`,
    source: bundle.name,
    level: bundle.level,
    type,
    bundleId: bundle.id,
  }));
}

/**
 * Get the list of active keywords for a weapon config, respecting overrides.
 */
export function getActiveKeywords(
  parsedKeywords: ParsedWeaponKeyword[],
  overrides: Record<string, boolean>,
): ParsedWeaponKeyword[] {
  return parsedKeywords.filter(kw => isKeywordActive(kw, overrides));
}
