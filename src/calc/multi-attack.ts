/** Sequential multi-unit attacks with wound carryover */

import type {
  AttackerUnitConfig,
  DefenderProfile,
  LeaderDefenseConfig,
  Modifier,
  AttackContext,
  SequentialAttackResult,
  UnitAttackResult,
} from './types.ts';
import { calculateUnitAttack } from './attack-sequence.ts';

export type PhaseMode = 'shooting' | 'fighting' | 'full_sequence';

/**
 * Calculate sequential attacks from multiple units against a single defender.
 * Wounds carry over between units. Stops early if defender is wiped out.
 *
 * When leaderDefense is provided, wound allocation splits between bodyguard and
 * leader pools (Look Out, Sir). Precision damage bypasses Look Out, Sir and
 * hits leaders first. When bodyguard is wiped, the defender profile switches
 * to use leader saves for subsequent attacks.
 */
export function calculateSequentialAttack(
  configs: AttackerUnitConfig[],
  armyModifiers: Modifier[],
  defender: DefenderProfile,
  phaseMode: PhaseMode,
  context: AttackContext,
  leaderDefense?: LeaderDefenseConfig,
): SequentialAttackResult {
  if (leaderDefense) {
    return calculateWithLeaderDefense(configs, armyModifiers, defender, phaseMode, context, leaderDefense);
  }

  return calculateSimple(configs, armyModifiers, defender, phaseMode, context);
}

/**
 * Simple sequential attack — no leader defense, original behavior.
 */
function calculateSimple(
  configs: AttackerUnitConfig[],
  armyModifiers: Modifier[],
  defender: DefenderProfile,
  phaseMode: PhaseMode,
  context: AttackContext,
): SequentialAttackResult {
  const orderedConfigs = orderByPhase(configs, phaseMode);

  const initialWoundPool = defender.wounds * defender.modelCount;
  let remainingWounds = initialWoundPool;
  let remainingModels = defender.modelCount;

  const unitResults: UnitAttackResult[] = [];
  const remainingWoundsAfterEachUnit: number[] = [];
  const modelsRemainingAfterEachUnit: number[] = [];

  for (const config of orderedConfigs) {
    if (remainingModels <= 0) break;

    const currentDefender: DefenderProfile = {
      ...defender,
      modelCount: remainingModels,
    };

    const result = calculateUnitAttack(config, armyModifiers, currentDefender, context, phaseMode);
    unitResults.push(result);

    remainingWounds = Math.max(0, remainingWounds - result.totalDamageAfterFnp);
    remainingModels = Math.max(0, Math.ceil(remainingWounds / defender.wounds));

    if (remainingWounds <= 0) {
      remainingModels = 0;
    }

    remainingWoundsAfterEachUnit.push(remainingWounds);
    modelsRemainingAfterEachUnit.push(remainingModels);
  }

  const totalDamage = unitResults.reduce((sum, r) => sum + r.totalDamageAfterFnp, 0);
  const totalModelsKilled = defender.modelCount - remainingModels;

  return {
    unitResults,
    defenderWoundTracker: {
      initialWoundPool,
      remainingWoundsAfterEachUnit,
      modelsRemainingAfterEachUnit,
    },
    totalDamage,
    totalModelsKilled,
    defenderWipedOut: remainingModels <= 0,
  };
}

/**
 * Leader-aware sequential attack with Look Out, Sir wound allocation.
 *
 * - Normal damage goes to bodyguard first, overflow to leaders
 * - Precision damage goes to leaders first, overflow to bodyguard
 * - When bodyguard is wiped, switch to best leader save for subsequent attacks
 */
function calculateWithLeaderDefense(
  configs: AttackerUnitConfig[],
  armyModifiers: Modifier[],
  defender: DefenderProfile,
  phaseMode: PhaseMode,
  context: AttackContext,
  leaderDefense: LeaderDefenseConfig,
): SequentialAttackResult {
  const orderedConfigs = orderByPhase(configs, phaseMode);
  const pool = leaderDefense.pool;

  let bodyguardWounds = pool.bodyguardWounds;
  let leaderWounds = pool.leaderWounds;
  const initialWoundPool = pool.totalWounds;

  const unitResults: UnitAttackResult[] = [];
  const remainingWoundsAfterEachUnit: number[] = [];
  const modelsRemainingAfterEachUnit: number[] = [];
  const bodyguardRemainingAfterEachUnit: number[] = [];
  const leaderRemainingAfterEachUnit: number[] = [];

  for (const config of orderedConfigs) {
    const totalRemaining = bodyguardWounds + leaderWounds;
    if (totalRemaining <= 0) break;

    // Build the defender profile for this attack:
    // If bodyguard is alive, use bodyguard save; otherwise use best leader save
    const currentDefender = buildCurrentDefender(
      defender, leaderDefense, bodyguardWounds, leaderWounds, pool,
    );

    const result = calculateUnitAttack(config, armyModifiers, currentDefender, context, phaseMode);
    unitResults.push(result);

    // Allocate damage to bodyguard/leader pools
    const normalDamage = result.totalDamageAfterFnp - result.totalPrecisionDamageAfterFnp;
    const precisionDamage = result.totalPrecisionDamageAfterFnp;

    // Normal damage: bodyguard first (Look Out, Sir)
    const normalToBodyguard = Math.min(normalDamage, bodyguardWounds);
    const normalOverflow = normalDamage - normalToBodyguard;

    // Precision damage: leaders first (bypasses Look Out, Sir)
    const precisionToLeader = Math.min(precisionDamage, leaderWounds);
    const precisionOverflow = precisionDamage - precisionToLeader;

    bodyguardWounds = Math.max(0, bodyguardWounds - normalToBodyguard - precisionOverflow);
    leaderWounds = Math.max(0, leaderWounds - precisionToLeader - normalOverflow);

    const totalNow = bodyguardWounds + leaderWounds;
    const remainingModels = computeRemainingModels(bodyguardWounds, leaderWounds, pool, leaderDefense);

    remainingWoundsAfterEachUnit.push(totalNow);
    modelsRemainingAfterEachUnit.push(remainingModels);
    bodyguardRemainingAfterEachUnit.push(bodyguardWounds);
    leaderRemainingAfterEachUnit.push(leaderWounds);
  }

  const totalRemaining = bodyguardWounds + leaderWounds;
  const totalDamage = unitResults.reduce((sum, r) => sum + r.totalDamageAfterFnp, 0);
  const remainingModels = computeRemainingModels(bodyguardWounds, leaderWounds, pool, leaderDefense);
  const totalModelsKilled = pool.modelCount - remainingModels;

  return {
    unitResults,
    defenderWoundTracker: {
      initialWoundPool,
      remainingWoundsAfterEachUnit,
      modelsRemainingAfterEachUnit,
      initialBodyguardWounds: pool.bodyguardWounds,
      initialLeaderWounds: pool.leaderWounds,
      bodyguardWoundsRemaining: bodyguardWounds,
      leaderWoundsRemaining: leaderWounds,
      bodyguardRemainingAfterEachUnit,
      leaderRemainingAfterEachUnit,
    },
    totalDamage,
    totalModelsKilled,
    defenderWipedOut: totalRemaining <= 0,
  };
}

/**
 * Build the defender profile for the current attack step.
 * When bodyguard is alive, use bodyguard saves and combined toughness.
 * When bodyguard is wiped, switch to best leader save/invuln.
 */
function buildCurrentDefender(
  baseDefender: DefenderProfile,
  leaderDefense: LeaderDefenseConfig,
  bodyguardWounds: number,
  leaderWounds: number,
  pool: import('./types.ts').CombinedDefensePool,
): DefenderProfile {
  const totalRemaining = bodyguardWounds + leaderWounds;
  const remainingModels = computeRemainingModels(bodyguardWounds, leaderWounds, pool, leaderDefense);

  if (bodyguardWounds > 0) {
    // Bodyguard alive: use bodyguard save, combined toughness, combined pool
    return {
      ...baseDefender,
      toughness: pool.toughness,
      save: pool.save,
      invulnerableSave: pool.invulnerableSave,
      feelNoPain: pool.feelNoPain,
      keywords: pool.keywords,
      wounds: totalRemaining,
      modelCount: remainingModels,
    };
  }

  // Bodyguard wiped: use best leader save/invuln
  const leaders = leaderDefense.leaders;
  const bestSave = Math.min(...leaders.map(l => l.save));
  const invulns = leaders.map(l => l.invulnerableSave).filter((v): v is number => v !== null);
  const bestInvuln = invulns.length > 0 ? Math.min(...invulns) : null;
  const fnps = leaders.map(l => l.feelNoPain).filter((v): v is number => v !== null);
  const bestFnp = fnps.length > 0 ? Math.min(...fnps) : null;

  return {
    ...baseDefender,
    toughness: pool.toughness,
    save: bestSave,
    invulnerableSave: bestInvuln,
    feelNoPain: bestFnp,
    keywords: pool.keywords,
    wounds: leaderWounds,
    modelCount: remainingModels,
  };
}

/**
 * Compute remaining models from bodyguard/leader wound pools.
 */
function computeRemainingModels(
  bodyguardWounds: number,
  leaderWounds: number,
  pool: import('./types.ts').CombinedDefensePool,
  leaderDefense: LeaderDefenseConfig,
): number {
  let models = 0;

  // Bodyguard models remaining
  if (bodyguardWounds > 0 && pool.bodyguardWoundsPerModel > 0) {
    models += Math.ceil(bodyguardWounds / pool.bodyguardWoundsPerModel);
  }

  // Leader models remaining — count each leader as alive if any leader wounds remain
  if (leaderWounds > 0) {
    let woundsLeft = leaderWounds;
    for (const leader of leaderDefense.leaders) {
      const leaderTotalW = leader.wounds * leader.modelCount;
      if (woundsLeft >= leaderTotalW) {
        models += leader.modelCount;
        woundsLeft -= leaderTotalW;
      } else if (woundsLeft > 0) {
        models += Math.ceil(woundsLeft / leader.wounds);
        woundsLeft = 0;
      }
    }
  }

  return models;
}

/**
 * Order configs by phase for full_sequence mode.
 * Shooting units first, then fighting units.
 */
function orderByPhase(
  configs: AttackerUnitConfig[],
  phaseMode: PhaseMode,
): AttackerUnitConfig[] {
  if (phaseMode !== 'full_sequence') return configs;

  const shooting = configs.filter(c => c.phase === 'shooting');
  const fighting = configs.filter(c => c.phase === 'fighting');
  return [...shooting, ...fighting];
}
