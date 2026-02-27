import { describe, it, expect } from 'vitest';
import { calculateSequentialAttack } from './multi-attack.ts';
import { buildCombinedDefensePool, flattenCombinedDefense } from './leader-defense.ts';
import { makeWeapon, makeWeaponConfig, makeDefender, makeAttackerConfig, makeContext } from './test-helpers.ts';
import type { LeaderDefenseConfig } from './types.ts';

describe('calculateSequentialAttack', () => {
  it('returns empty results with no attackers', () => {
    const defender = makeDefender({ wounds: 2, modelCount: 5 });
    const result = calculateSequentialAttack([], [], defender, 'shooting', makeContext());

    expect(result.unitResults).toHaveLength(0);
    expect(result.totalDamage).toBe(0);
    expect(result.totalModelsKilled).toBe(0);
    expect(result.defenderWipedOut).toBe(false);
    expect(result.defenderWoundTracker.initialWoundPool).toBe(10);
  });

  it('calculates damage from a single unit', () => {
    const weapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const result = calculateSequentialAttack([config], [], defender, 'shooting', makeContext());

    expect(result.unitResults).toHaveLength(1);
    expect(result.totalDamage).toBeGreaterThan(0);
    expect(result.defenderWoundTracker.remainingWoundsAfterEachUnit).toHaveLength(1);
  });

  it('carries wounds over between units', () => {
    // Two units of 10 bolters each
    const weapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const config1 = makeAttackerConfig({
      unitInstanceId: 'unit-1',
      unitName: 'Squad 1',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });
    const config2 = makeAttackerConfig({
      unitInstanceId: 'unit-2',
      unitName: 'Squad 2',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const result = calculateSequentialAttack([config1, config2], [], defender, 'shooting', makeContext());

    expect(result.unitResults).toHaveLength(2);
    // Second unit's remaining wounds should be less than first's
    const tracker = result.defenderWoundTracker;
    expect(tracker.remainingWoundsAfterEachUnit[1]).toBeLessThan(tracker.remainingWoundsAfterEachUnit[0]);
  });

  it('stops early if defender is wiped out', () => {
    // Massive overkill weapon
    const weapon = makeWeapon({ name: 'Nuke', A: '100', BS_WS: '2+', S: '16', AP: '-4', D: '6', count: 1, type: 'ranged', range: '24"' });
    const config1 = makeAttackerConfig({
      unitInstanceId: 'unit-1',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });
    const config2 = makeAttackerConfig({
      unitInstanceId: 'unit-2',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 5 });
    const result = calculateSequentialAttack([config1, config2], [], defender, 'shooting', makeContext());

    expect(result.defenderWipedOut).toBe(true);
    expect(result.totalModelsKilled).toBe(5);
    // Second unit shouldn't have attacked since defender was wiped
    expect(result.unitResults).toHaveLength(1);
  });

  it('orders shooting before fighting in full_sequence mode', () => {
    const rangedWeapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const meleeWeapon = makeWeapon({ name: 'Choppa', A: '3', BS_WS: '3+', S: '5', AP: '-1', D: '1', count: 10, type: 'melee', range: 'Melee' });

    // Order in configs: fighting first, shooting second
    const fightConfig = makeAttackerConfig({
      unitInstanceId: 'melee-unit',
      unitName: 'Melee Unit',
      phase: 'fighting',
      weapons: [makeWeaponConfig(meleeWeapon)],
    });
    const shootConfig = makeAttackerConfig({
      unitInstanceId: 'ranged-unit',
      unitName: 'Ranged Unit',
      phase: 'shooting',
      weapons: [makeWeaponConfig(rangedWeapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 20 });
    const result = calculateSequentialAttack(
      [fightConfig, shootConfig], [], defender, 'full_sequence', makeContext(),
    );

    // In full_sequence, shooting should come first despite config order
    expect(result.unitResults[0].unitName).toBe('Ranged Unit');
    expect(result.unitResults[0].phase).toBe('shooting');
    expect(result.unitResults[1].unitName).toBe('Melee Unit');
    expect(result.unitResults[1].phase).toBe('fighting');
  });

  it('preserves config order within same phase', () => {
    const weapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const config1 = makeAttackerConfig({
      unitInstanceId: 'unit-1',
      unitName: 'First',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });
    const config2 = makeAttackerConfig({
      unitInstanceId: 'unit-2',
      unitName: 'Second',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 20 });
    const result = calculateSequentialAttack(
      [config1, config2], [], defender, 'shooting', makeContext(),
    );

    expect(result.unitResults[0].unitName).toBe('First');
    expect(result.unitResults[1].unitName).toBe('Second');
  });

  it('blast adjusts with reducing model count', () => {
    // Blast weapon against 11 models -> 2 extra attacks initially
    const weapon = makeWeapon({ name: 'Blast Gun', A: '2', BS_WS: '3+', S: '8', AP: '-2', D: '2', count: 1, type: 'ranged', range: '24"', keywords: 'Blast' });
    const config1 = makeAttackerConfig({
      unitInstanceId: 'unit-1',
      unitName: 'Blast Unit 1',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });
    const config2 = makeAttackerConfig({
      unitInstanceId: 'unit-2',
      unitName: 'Blast Unit 2',
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 11 });
    const result = calculateSequentialAttack(
      [config1, config2], [], defender, 'shooting', makeContext(),
    );

    // Both units should have results (if defender survives first)
    expect(result.unitResults.length).toBeGreaterThanOrEqual(1);
    // Total kills should reflect wound carryover
    expect(result.totalModelsKilled).toBeGreaterThan(0);
  });

  it('tracks wound pool correctly with multi-wound models', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '5', BS_WS: '3+', S: '8', AP: '-2', D: '3', count: 1, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 3, modelCount: 5 });
    const result = calculateSequentialAttack([config], [], defender, 'shooting', makeContext());

    expect(result.defenderWoundTracker.initialWoundPool).toBe(15); // 5 * 3
    expect(result.defenderWoundTracker.remainingWoundsAfterEachUnit[0]).toBeLessThan(15);
  });
});

describe('calculateSequentialAttack with leader defense', () => {
  function makeLeaderDefense(
    bodyguard: import('./types.ts').DefenderProfile,
    leaders: import('./types.ts').DefenderProfile[],
  ): { defender: import('./types.ts').DefenderProfile; leaderDefense: LeaderDefenseConfig } {
    const pool = buildCombinedDefensePool(bodyguard, leaders);
    const defender = flattenCombinedDefense(pool);
    return { defender, leaderDefense: { pool, leaders } };
  }

  it('is backwards compatible when no leaderDefense is passed', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });

    const result = calculateSequentialAttack([config], [], defender, 'shooting', makeContext());

    // No leader defense fields should be present
    expect(result.defenderWoundTracker.bodyguardWoundsRemaining).toBeUndefined();
    expect(result.defenderWoundTracker.leaderWoundsRemaining).toBeUndefined();
    expect(result.defenderWoundTracker.bodyguardRemainingAfterEachUnit).toBeUndefined();
    expect(result.defenderWoundTracker.leaderRemainingAfterEachUnit).toBeUndefined();
  });

  it('splits damage: normal goes to bodyguard first', () => {
    // High-damage non-precision weapon should send damage to bodyguard first
    const weapon = makeWeapon({ name: 'Big Gun', A: '20', BS_WS: '2+', S: '8', AP: '-3', D: '1', count: 1, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, save: 5, wounds: 1, modelCount: 10 });
    const leader = makeDefender({ name: 'Warboss', toughness: 5, save: 4, wounds: 6, modelCount: 1, invulnerableSave: 4 });
    const { defender, leaderDefense } = makeLeaderDefense(bodyguard, [leader]);

    const result = calculateSequentialAttack([config], [], defender, 'shooting', makeContext(), leaderDefense);
    const tracker = result.defenderWoundTracker;

    // Bodyguard should take damage first (Look Out, Sir)
    expect(tracker.bodyguardWoundsRemaining).toBeDefined();
    expect(tracker.leaderWoundsRemaining).toBeDefined();
    // With 10W bodyguard, some bodyguard wounds should be lost
    expect(tracker.bodyguardRemainingAfterEachUnit![0]).toBeLessThan(10);
    // Leader should still have full or mostly full wounds (only overflow)
    expect(tracker.leaderRemainingAfterEachUnit![0]).toBeLessThanOrEqual(6);
  });

  it('precision damage goes to leader pool first', () => {
    // Precision weapon: all damage bypasses Look Out, Sir
    const precisionWeapon = makeWeapon({ name: 'Sniper', A: '20', BS_WS: '2+', S: '5', AP: '-2', D: '1', count: 1, type: 'ranged', range: '36"', keywords: 'Precision' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(precisionWeapon)],
    });

    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, save: 5, wounds: 1, modelCount: 10 });
    const leader = makeDefender({ name: 'Warboss', toughness: 5, save: 4, wounds: 6, modelCount: 1 });
    const { defender, leaderDefense } = makeLeaderDefense(bodyguard, [leader]);

    const result = calculateSequentialAttack([config], [], defender, 'shooting', makeContext(), leaderDefense);
    const tracker = result.defenderWoundTracker;

    // Precision damage targets leader first
    expect(tracker.leaderRemainingAfterEachUnit![0]).toBeLessThan(6);
    // Bodyguard should only take overflow damage (if leader is wiped)
    // With only 6W on the leader, some overflow is likely
  });

  it('saves switch to leader profile when bodyguard is wiped', () => {
    // First unit should wipe bodyguard but not leader
    const bigWeapon = makeWeapon({ name: 'Heavy Gun', A: '10', BS_WS: '3+', S: '8', AP: '-2', D: '1', count: 1, type: 'ranged', range: '24"' });
    // Second unit attacks — should use leader saves
    const smallWeapon = makeWeapon({ name: 'Bolter', A: '5', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, type: 'ranged', range: '24"' });

    const config1 = makeAttackerConfig({
      unitInstanceId: 'unit-1',
      unitName: 'Devastators',
      phase: 'shooting',
      weapons: [makeWeaponConfig(bigWeapon)],
    });
    const config2 = makeAttackerConfig({
      unitInstanceId: 'unit-2',
      unitName: 'Scouts',
      phase: 'shooting',
      weapons: [makeWeaponConfig(smallWeapon)],
    });

    // Small bodyguard that will be wiped, tanky leader
    const bodyguard = makeDefender({ name: 'Grots', toughness: 3, save: 7, wounds: 1, modelCount: 3 });
    const leader = makeDefender({ name: 'Captain', toughness: 5, save: 2, wounds: 20, modelCount: 1, invulnerableSave: 4 });
    const { defender, leaderDefense } = makeLeaderDefense(bodyguard, [leader]);

    const result = calculateSequentialAttack([config1, config2], [], defender, 'shooting', makeContext(), leaderDefense);
    const tracker = result.defenderWoundTracker;

    // Bodyguard (3W total) should be wiped after first unit's damage
    expect(tracker.bodyguardRemainingAfterEachUnit![0]).toBe(0);
    // Leader (20W with 2+ save / 4++ invuln) should still have wounds
    expect(tracker.leaderWoundsRemaining!).toBeGreaterThan(0);
    // Second unit should have attacked (result should have 2 entries)
    expect(result.unitResults.length).toBe(2);
  });

  it('populates initial bodyguard/leader wound values', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, save: 5, wounds: 1, modelCount: 10 });
    const leader = makeDefender({ name: 'Warboss', toughness: 5, save: 4, wounds: 6, modelCount: 1 });
    const { defender, leaderDefense } = makeLeaderDefense(bodyguard, [leader]);

    const result = calculateSequentialAttack([config], [], defender, 'shooting', makeContext(), leaderDefense);
    const tracker = result.defenderWoundTracker;

    expect(tracker.initialBodyguardWounds).toBe(10);
    expect(tracker.initialLeaderWounds).toBe(6);
    expect(tracker.initialWoundPool).toBe(16);
  });
});
