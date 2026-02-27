/**
 * Core 10th Edition attack sequence math.
 * V1: averages only. V2 will add probability distributions.
 */

import type {
  WeaponConfig,
  AttackerUnitConfig,
  DefenderProfile,
  ResolvedModifiers,
  ResolvedDefensiveModifiers,
  AttackContext,
  WeaponResult,
  UnitAttackResult,
} from './types.ts';
import { resolveWeaponStat, parseThreshold } from './dice.ts';
import { resolveOffensiveModifiers, resolveDefensiveModifiers, getActiveKeywords } from './modifiers.ts';

/**
 * 10th Edition wound threshold table.
 * Returns the number needed on a D6 to wound.
 */
export function getWoundThreshold(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5; // strength < toughness
}

/** Probability of rolling >= threshold on a D6 */
function probOfThreshold(threshold: number): number {
  if (threshold <= 1) return 1;
  if (threshold >= 7) return 0;
  return (7 - threshold) / 6;
}

/** Probability of rolling exactly a value on a D6 */
function probOfExact(value: number): number {
  if (value < 1 || value > 6) return 0;
  return 1 / 6;
}

/**
 * Calculate effective hits after rerolls.
 *
 * @param attacks - total number of attacks
 * @param threshold - number needed to hit (from BS/WS +/- modifier)
 * @param reroll - reroll mode
 * @param critThreshold - critical hit threshold (default 6)
 * @returns { normalHits, criticalHits, totalHits }
 */
function calculateHits(
  attacks: number,
  threshold: number,
  reroll: 'none' | 'ones' | 'all_failed' | 'all_non_crit',
  critThreshold: number,
): { normalHits: number; criticalHits: number; totalHits: number } {
  // Clamp threshold
  const effectiveThreshold = Math.max(2, Math.min(6, threshold));

  // Crit probability: rolls of critThreshold or higher, but they still need to meet the hit threshold
  // In 10th edition, crits happen on natural 6s (or modified threshold) and always hit regardless of modifiers
  const critProb = probOfThreshold(critThreshold);

  // Normal hit probability: rolls >= threshold but below crit threshold
  const normalHitProb = Math.max(0, probOfThreshold(effectiveThreshold) - critProb);

  // Miss probability
  const missProb = 1 - normalHitProb - critProb;

  // Apply rerolls
  let effectiveNormalHitProb = normalHitProb;
  let effectiveCritProb = critProb;

  if (reroll === 'ones') {
    // Reroll 1s: probability of rolling a 1 is 1/6
    const rerollChance = probOfExact(1);
    effectiveNormalHitProb += rerollChance * normalHitProb;
    effectiveCritProb += rerollChance * critProb;
  } else if (reroll === 'all_failed') {
    // Reroll all failed: miss probability * hit probability on second roll
    effectiveNormalHitProb += missProb * normalHitProb;
    effectiveCritProb += missProb * critProb;
  } else if (reroll === 'all_non_crit') {
    // Fish for crits: reroll everything that's not a critical hit.
    // Original normal hits are sacrificed for another chance at crits.
    // Only crits from round 1 are kept; all non-crits (1 - critProb) are rerolled.
    const nonCritProb = 1 - critProb;
    effectiveCritProb = critProb + nonCritProb * critProb;
    effectiveNormalHitProb = nonCritProb * normalHitProb;
  }

  const criticalHits = attacks * effectiveCritProb;
  const normalHits = attacks * effectiveNormalHitProb;

  return {
    normalHits,
    criticalHits,
    totalHits: normalHits + criticalHits,
  };
}

/**
 * Calculate effective wounds after rerolls.
 */
function calculateWounds(
  hits: number,
  criticalHits: number,
  woundThreshold: number,
  reroll: 'none' | 'ones' | 'all_failed' | 'all_non_crit',
  critWoundThreshold: number,
  hasLethalHits: boolean,
): { normalWounds: number; criticalWounds: number; totalWounds: number; autoWounds: number } {
  const effectiveThreshold = Math.max(2, Math.min(6, woundThreshold));

  // Lethal Hits: critical hits in the hit roll auto-wound (skip wound roll entirely)
  const autoWounds = hasLethalHits ? criticalHits : 0;
  const hitsNeedingWoundRoll = hits - autoWounds;

  if (hitsNeedingWoundRoll <= 0) {
    return { normalWounds: 0, criticalWounds: 0, totalWounds: autoWounds, autoWounds };
  }

  // Critical wound probability
  const critWoundProb = probOfThreshold(critWoundThreshold);
  const normalWoundProb = Math.max(0, probOfThreshold(effectiveThreshold) - critWoundProb);
  const missProb = 1 - normalWoundProb - critWoundProb;

  let effectiveNormalWoundProb = normalWoundProb;
  let effectiveCritWoundProb = critWoundProb;

  if (reroll === 'ones') {
    const rerollChance = probOfExact(1);
    effectiveNormalWoundProb += rerollChance * normalWoundProb;
    effectiveCritWoundProb += rerollChance * critWoundProb;
  } else if (reroll === 'all_failed') {
    effectiveNormalWoundProb += missProb * normalWoundProb;
    effectiveCritWoundProb += missProb * critWoundProb;
  } else if (reroll === 'all_non_crit') {
    // Fish for crit wounds: reroll everything that's not a critical wound.
    // Sacrifices normal wounds for more chances at crits (dev wounds, etc.)
    const nonCritProb = 1 - critWoundProb;
    effectiveCritWoundProb = critWoundProb + nonCritProb * critWoundProb;
    effectiveNormalWoundProb = nonCritProb * normalWoundProb;
  }

  const criticalWounds = hitsNeedingWoundRoll * effectiveCritWoundProb;
  const normalWounds = hitsNeedingWoundRoll * effectiveNormalWoundProb;

  return {
    normalWounds,
    criticalWounds,
    totalWounds: normalWounds + criticalWounds + autoWounds,
    autoWounds,
  };
}

/**
 * Calculate unsaved wounds after armor/invuln saves.
 */
function calculateSaves(
  normalWounds: number,
  criticalWounds: number,
  autoWounds: number,
  armorSave: number,
  totalAP: number,
  invulnSave: number | null,
  defSaveModifier: number,
  hasDevWounds: boolean,
  hasIgnoresCover: boolean,
  rerollSaves: 'none' | 'ones' | 'all_failed' = 'none',
): { normalUnsavedWounds: number; mortalWounds: number } {
  // Devastating wounds: critical wounds become mortal wounds (bypass saves entirely)
  const mortalWounds = hasDevWounds ? criticalWounds : 0;
  const woundsNeedingSave = normalWounds + (hasDevWounds ? 0 : criticalWounds) + autoWounds;

  if (woundsNeedingSave <= 0) return { normalUnsavedWounds: 0, mortalWounds };

  // Armor save modified by AP: save value + AP (worse save)
  let modifiedArmorSave = armorSave + totalAP;

  // Apply cover benefit (if not ignoring cover): +1 to save (better)
  if (defSaveModifier > 0 && !hasIgnoresCover) {
    modifiedArmorSave -= defSaveModifier;
  }

  // Invulnerable save (unmodified by AP or cover)
  let bestSave = modifiedArmorSave;
  if (invulnSave !== null) {
    bestSave = Math.min(modifiedArmorSave, invulnSave);
  }

  // Probability of failing the save
  let saveProb = probOfThreshold(bestSave);
  let failProb = 1 - saveProb;

  // Apply save rerolls
  if (rerollSaves === 'ones') {
    // Reroll 1s: probability of rolling a 1 is 1/6, re-save on those
    const rerollChance = probOfExact(1);
    saveProb += rerollChance * saveProb;
    failProb = 1 - saveProb;
  } else if (rerollSaves === 'all_failed') {
    // Reroll all failed: failProb * saveProb extra saves
    saveProb += failProb * saveProb;
    failProb = 1 - saveProb;
  }

  return {
    normalUnsavedWounds: woundsNeedingSave * failProb,
    mortalWounds,
  };
}

/**
 * Calculate a single weapon's attack against a defender.
 */
export function calculateWeaponAttack(
  weaponConfig: WeaponConfig,
  defender: DefenderProfile,
  offMods: ResolvedModifiers,
  defMods: ResolvedDefensiveModifiers,
  context: AttackContext,
): WeaponResult {
  const weapon = weaponConfig.weapon;
  const so = weaponConfig.statOverrides;
  const activeKeywords = getActiveKeywords(weaponConfig.parsedKeywords, weaponConfig.keywordOverrides);

  // --- 1. Attacks ---
  const baseAttacks = resolveWeaponStat(so?.A ?? weapon.A);
  const weaponCount = weapon.count;
  let totalAttacks = baseAttacks * weaponCount + offMods.attacksModifier;

  // Blast: +1 attack per 5 models in target unit
  const hasBlast = activeKeywords.some(k => k.keyword === 'blast');
  if (hasBlast) {
    totalAttacks += Math.floor(defender.modelCount / 5) * weaponCount;
  }

  // Rapid Fire: +N attacks per weapon at half range
  const rapidFire = activeKeywords.find(k => k.keyword === 'rapid_fire');
  if (rapidFire && context.halfRange) {
    totalAttacks += rapidFire.value * weaponCount;
  }

  // Extra Attacks: add N per weapon (these don't replace normal attacks)
  const extraAttacks = activeKeywords.find(k => k.keyword === 'extra_attacks');
  if (extraAttacks) {
    totalAttacks += extraAttacks.value * weaponCount;
  }

  totalAttacks = Math.max(0, totalAttacks);

  // --- 2. Hits ---
  const hasTorrent = activeKeywords.some(k => k.keyword === 'torrent');
  let normalHits: number;
  let criticalHits: number;

  if (hasTorrent) {
    // Torrent: auto-hit, no hit roll (even during overwatch)
    normalHits = totalAttacks;
    criticalHits = 0;
  } else if (context.isOverwatch) {
    // Overwatch: hits on 6 only, ignore hit modifiers, but allow rerolls and crit thresholds
    const hitResult = calculateHits(
      totalAttacks,
      6,
      offMods.rerollHits,
      offMods.criticalHitThreshold,
    );
    normalHits = hitResult.normalHits;
    criticalHits = hitResult.criticalHits;
  } else {
    const bsWs = parseThreshold(so?.BS_WS ?? weapon.BS_WS);
    if (bsWs === null) {
      // No BS/WS (e.g., melee-only stat on ranged line) — treat as auto-miss
      normalHits = 0;
      criticalHits = 0;
    } else {
      // Apply BS/WS characteristic modifier (not subject to +1/-1 clamping)
      const isMeleeWeapon = weapon.type.toLowerCase() === 'melee' || weapon.range === 'Melee';
      const bsWsMod = isMeleeWeapon ? offMods.wsModifier : offMods.bsModifier;
      const modifiedBsWs = bsWs - bsWsMod; // positive mod = lower threshold = better

      // Combine attacker hit roll mod with defender hit mod, then clamp to [-1, +1]
      const netHitMod = Math.max(-1, Math.min(1, offMods.hitRollModifier + defMods.hitModifier));
      const hitThreshold = modifiedBsWs - netHitMod;
      const hitResult = calculateHits(
        totalAttacks,
        hitThreshold,
        offMods.rerollHits,
        offMods.criticalHitThreshold,
      );
      normalHits = hitResult.normalHits;
      criticalHits = hitResult.criticalHits;
    }
  }

  // Sustained Hits: each critical hit generates N extra hits
  let totalHits = normalHits + criticalHits;
  if (offMods.sustainedHitsValue > 0) {
    totalHits += criticalHits * offMods.sustainedHitsValue;
  }

  // --- 3. Wounds ---
  const weaponStrength = resolveWeaponStat(so?.S ?? weapon.S) + offMods.strengthModifier;
  const woundThresholdBase = getWoundThreshold(weaponStrength, defender.toughness);
  // Combine attacker wound mod with defender wound mod, then clamp to [-1, +1]
  const netWoundMod = Math.max(-1, Math.min(1, offMods.woundRollModifier + defMods.woundModifier));
  const woundThreshold = woundThresholdBase - netWoundMod;

  // Anti-X: if target has the keyword, lower crit wound threshold
  let critWoundThreshold = offMods.criticalWoundThreshold;
  for (const kw of activeKeywords) {
    if (kw.keyword === 'anti') {
      const targetHasKeyword = defender.keywords.some(
        dk => dk.toLowerCase() === kw.target.toLowerCase(),
      );
      if (targetHasKeyword) {
        critWoundThreshold = Math.min(critWoundThreshold, kw.threshold);
      }
    }
  }

  const woundResult = calculateWounds(
    totalHits,
    criticalHits,
    woundThreshold,
    offMods.rerollWounds,
    critWoundThreshold,
    offMods.hasLethalHits,
  );

  // --- 4. Saves ---
  const weaponAPRaw = resolveWeaponStat(so?.AP ?? weapon.AP);
  // AP is stored as negative in weapon data (e.g., "-2"), make it positive for calculation
  const weaponAP = Math.abs(weaponAPRaw);

  const hasIgnoresCover = activeKeywords.some(k => k.keyword === 'ignores_cover');

  // Use defender's natural invuln save, potentially overridden by defensive modifiers
  const effectiveInvuln = defMods.invulnerableSave ?? defender.invulnerableSave;

  const saveResult = calculateSaves(
    woundResult.normalWounds,
    woundResult.criticalWounds,
    woundResult.autoWounds,
    defender.save,
    weaponAP + offMods.apModifier,
    effectiveInvuln,
    defMods.saveModifier,
    offMods.hasDevastatingWounds,
    hasIgnoresCover,
    defMods.rerollSaves,
  );
  const unsavedWounds = saveResult.normalUnsavedWounds + saveResult.mortalWounds;

  // --- 5. Damage ---
  const baseDamage = resolveWeaponStat(so?.D ?? weapon.D);

  // Melta: at half range, add N to each damage roll
  const melta = activeKeywords.find(k => k.keyword === 'melta');
  const meltaBonus = (melta && context.halfRange) ? melta.value : 0;

  // Normal wounds: apply damage modifications (halve → add melta → reduce)
  let normalDmgPerWound = baseDamage;
  if (defMods.halfDamage) {
    normalDmgPerWound = Math.ceil(normalDmgPerWound / 2);
  }
  normalDmgPerWound += meltaBonus;
  if (defMods.damageReduction > 0) {
    normalDmgPerWound = Math.max(defMods.damageMinimum, normalDmgPerWound - defMods.damageReduction);
  }

  // Dev wounds (mortal wounds): use unmodified damage characteristic + melta (bypass damage mods)
  const devDmgPerWound = baseDamage + meltaBonus;

  const totalDamage = saveResult.normalUnsavedWounds * normalDmgPerWound
                    + saveResult.mortalWounds * devDmgPerWound;

  // Apply FNP
  let damageAfterFnp = totalDamage;
  const fnp = defMods.feelNoPain ?? defender.feelNoPain;
  if (fnp !== null) {
    const fnpProb = probOfThreshold(fnp);
    damageAfterFnp = totalDamage * (1 - fnpProb);
  }

  // --- 6. Precision ---
  const hasPrecision = activeKeywords.some(k => k.keyword === 'precision');
  const precisionDamageAfterFnp = hasPrecision ? damageAfterFnp : 0;

  // --- 7. Kills ---
  const modelsKilled = damageAfterFnp / defender.wounds;

  return {
    weaponName: weapon.name,
    profileName: weapon.profileName,
    weaponCount,
    totalAttacks,
    hits: totalHits,
    criticalHits,
    wounds: woundResult.totalWounds,
    criticalWounds: woundResult.criticalWounds,
    unsavedWounds,
    totalDamage,
    damageAfterFnp,
    precisionDamageAfterFnp,
    modelsKilled,
    activeKeywords,
    activeModifiers: offMods,
    activeDefensiveModifiers: defMods,
  };
}

/**
 * Calculate all weapon attacks for a unit against a defender.
 */
export function calculateUnitAttack(
  unitConfig: AttackerUnitConfig,
  armyModifiers: import('./types.ts').Modifier[],
  defender: DefenderProfile,
  context: AttackContext,
  phaseMode?: import('./types.ts').PhaseMode,
): UnitAttackResult {
  const defMods = resolveDefensiveModifiers(defender.modifiers);
  const weaponResults: WeaponResult[] = [];
  const effectivePhase = phaseMode ?? unitConfig.phase;

  for (const wc of unitConfig.weapons) {
    if (!wc.enabled) continue;

    // Determine if this weapon is for the current phase (mutually exclusive)
    const isMelee = wc.weapon.type.toLowerCase() === 'melee' || wc.weapon.range === 'Melee';
    const isRanged = !isMelee;

    if (effectivePhase === 'shooting' && !isRanged) continue;
    if (effectivePhase === 'fighting' && !isMelee) continue;

    const activeKeywords = getActiveKeywords(wc.parsedKeywords, wc.keywordOverrides);

    // Resolve modifiers at all levels
    const modelMods = unitConfig.modelModifiers[wc.weapon.name.toLowerCase()] ?? [];
    const offMods = resolveOffensiveModifiers(
      armyModifiers,
      unitConfig.modifiers,
      modelMods,
      wc.modifiers,
      activeKeywords,
      context,
    );

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, context);
    weaponResults.push(result);
  }

  const totalDamage = weaponResults.reduce((sum, r) => sum + r.totalDamage, 0);
  const totalDamageAfterFnp = weaponResults.reduce((sum, r) => sum + r.damageAfterFnp, 0);
  const totalPrecisionDamageAfterFnp = weaponResults.reduce((sum, r) => sum + r.precisionDamageAfterFnp, 0);
  const totalModelsKilled = totalDamageAfterFnp / defender.wounds;

  return {
    unitName: unitConfig.unitName,
    unitInstanceId: unitConfig.unitInstanceId,
    phase: effectivePhase === 'full_sequence' ? unitConfig.phase : effectivePhase,
    weapons: weaponResults,
    totalDamage,
    totalDamageAfterFnp,
    totalPrecisionDamageAfterFnp,
    totalModelsKilled,
  };
}
