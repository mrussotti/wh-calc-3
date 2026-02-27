/** Combined leader + bodyguard defense pool */

import type { DefenderProfile, CombinedDefensePool } from './types.ts';

/**
 * Build a combined defense pool from a bodyguard unit and its attached leaders.
 * Uses simplified 10th edition rules:
 * - Majority toughness (most wounds at a given T value)
 * - Combined wound pool
 * - Bodyguard save (they take wounds first via Look Out, Sir)
 */
export function buildCombinedDefensePool(
  bodyguard: DefenderProfile,
  leaders: DefenderProfile[],
): CombinedDefensePool {
  const bodyguardTotalWounds = bodyguard.wounds * bodyguard.modelCount;
  const leaderTotalWounds = leaders.reduce((sum, l) => sum + l.wounds * l.modelCount, 0);
  const totalWounds = bodyguardTotalWounds + leaderTotalWounds;
  const totalModels = bodyguard.modelCount + leaders.reduce((sum, l) => sum + l.modelCount, 0);

  // Majority toughness: the toughness value covering the most wounds
  const toughness = getMajorityToughness(bodyguard, leaders);

  // Combined keyword set
  const allKeywords = new Set(bodyguard.keywords);
  for (const leader of leaders) {
    for (const kw of leader.keywords) {
      allKeywords.add(kw);
    }
  }

  return {
    name: leaders.length > 0
      ? `${bodyguard.name} + ${leaders.map(l => l.name).join(', ')}`
      : bodyguard.name,
    toughness,
    save: bodyguard.save, // bodyguard takes wounds first
    invulnerableSave: bodyguard.invulnerableSave,
    totalWounds,
    modelCount: totalModels,
    feelNoPain: bodyguard.feelNoPain,
    keywords: [...allKeywords],
    bodyguardWounds: bodyguardTotalWounds,
    leaderWounds: leaderTotalWounds,
    bodyguardModelCount: bodyguard.modelCount,
    bodyguardWoundsPerModel: bodyguard.wounds,
  };
}

/**
 * Flatten a combined defense pool into a DefenderProfile.
 * This simplifies the pool for use in the attack calculator.
 */
export function flattenCombinedDefense(pool: CombinedDefensePool): DefenderProfile {
  return {
    name: pool.name,
    toughness: pool.toughness,
    save: pool.save,
    invulnerableSave: pool.invulnerableSave,
    wounds: pool.totalWounds, // total wound pool treated as one bucket
    modelCount: 1, // treat as single "super-model" for damage calculation
    feelNoPain: pool.feelNoPain,
    keywords: pool.keywords,
    modifiers: [],
  };
}

/**
 * Determine majority toughness: the T value that covers the most total wounds.
 */
function getMajorityToughness(
  bodyguard: DefenderProfile,
  leaders: DefenderProfile[],
): number {
  const toughnessMap = new Map<number, number>();

  // Bodyguard contributes its wounds * model count at its toughness
  const bgWounds = bodyguard.wounds * bodyguard.modelCount;
  toughnessMap.set(bodyguard.toughness, (toughnessMap.get(bodyguard.toughness) ?? 0) + bgWounds);

  // Each leader contributes their wounds * model count
  for (const leader of leaders) {
    const lWounds = leader.wounds * leader.modelCount;
    toughnessMap.set(leader.toughness, (toughnessMap.get(leader.toughness) ?? 0) + lWounds);
  }

  // Return the toughness with the most wounds
  let majorityT = bodyguard.toughness;
  let maxWounds = 0;
  for (const [t, w] of toughnessMap) {
    if (w > maxWounds) {
      majorityT = t;
      maxWounds = w;
    }
  }

  return majorityT;
}
