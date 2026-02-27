import { describe, it, expect } from 'vitest';
import { buildCombinedDefensePool, flattenCombinedDefense } from './leader-defense.ts';
import { makeDefender } from './test-helpers.ts';

describe('buildCombinedDefensePool', () => {
  it('returns bodyguard stats when no leaders attached', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, save: 5, wounds: 1, modelCount: 10 });
    const pool = buildCombinedDefensePool(bodyguard, []);

    expect(pool.name).toBe('Boyz');
    expect(pool.toughness).toBe(5);
    expect(pool.save).toBe(5);
    expect(pool.totalWounds).toBe(10);
    expect(pool.modelCount).toBe(10);
  });

  it('combines wounds from bodyguard and leader', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, wounds: 1, modelCount: 10 });
    const leader = makeDefender({ name: 'Warboss', toughness: 5, wounds: 6, modelCount: 1 });
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    expect(pool.totalWounds).toBe(16); // 10 + 6
    expect(pool.modelCount).toBe(11);
    expect(pool.bodyguardWounds).toBe(10);
    expect(pool.leaderWounds).toBe(6);
  });

  it('uses majority toughness — bodyguard majority', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, wounds: 1, modelCount: 10 }); // 10W at T5
    const leader = makeDefender({ name: 'Warboss', toughness: 6, wounds: 6, modelCount: 1 }); // 6W at T6
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    // T5 has 10 wounds, T6 has 6 wounds -> majority is T5
    expect(pool.toughness).toBe(5);
  });

  it('uses majority toughness — leader majority', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, wounds: 1, modelCount: 3 }); // 3W at T5
    const leader = makeDefender({ name: 'Warboss', toughness: 6, wounds: 6, modelCount: 1 }); // 6W at T6
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    // T5 has 3 wounds, T6 has 6 wounds -> majority is T6
    expect(pool.toughness).toBe(6);
  });

  it('uses bodyguard save (bodyguard-first allocation)', () => {
    const bodyguard = makeDefender({ name: 'Boyz', save: 5, wounds: 1, modelCount: 10 });
    const leader = makeDefender({ name: 'Warboss', save: 4, wounds: 6, modelCount: 1 });
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    expect(pool.save).toBe(5); // bodyguard save, not leader
  });

  it('combines keywords from all units', () => {
    const bodyguard = makeDefender({ keywords: ['Infantry', 'Mob'] });
    const leader = makeDefender({ keywords: ['Infantry', 'Character'] });
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    expect(pool.keywords).toContain('Infantry');
    expect(pool.keywords).toContain('Mob');
    expect(pool.keywords).toContain('Character');
    // No duplicates
    expect(pool.keywords.filter(k => k === 'Infantry')).toHaveLength(1);
  });

  it('includes bodyguardModelCount and bodyguardWoundsPerModel', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, wounds: 1, modelCount: 10 });
    const leader = makeDefender({ name: 'Warboss', toughness: 5, wounds: 6, modelCount: 1 });
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    expect(pool.bodyguardModelCount).toBe(10);
    expect(pool.bodyguardWoundsPerModel).toBe(1);
  });

  it('bodyguardModelCount reflects bodyguard only, not leaders', () => {
    const bodyguard = makeDefender({ name: 'Terminators', toughness: 5, wounds: 3, modelCount: 5 });
    const leader = makeDefender({ name: 'Captain', toughness: 5, wounds: 6, modelCount: 1 });
    const pool = buildCombinedDefensePool(bodyguard, [leader]);

    expect(pool.bodyguardModelCount).toBe(5);
    expect(pool.bodyguardWoundsPerModel).toBe(3);
    expect(pool.modelCount).toBe(6); // total includes leader
  });

  it('handles two leaders', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, wounds: 1, modelCount: 10 });
    const leader1 = makeDefender({ name: 'Warboss', toughness: 5, wounds: 6, modelCount: 1 });
    const leader2 = makeDefender({ name: 'Painboy', toughness: 5, wounds: 4, modelCount: 1 });
    const pool = buildCombinedDefensePool(bodyguard, [leader1, leader2]);

    expect(pool.totalWounds).toBe(20); // 10 + 6 + 4
    expect(pool.modelCount).toBe(12);
    expect(pool.name).toBe('Boyz + Warboss, Painboy');
  });
});

describe('flattenCombinedDefense', () => {
  it('flattens pool into a single DefenderProfile', () => {
    const bodyguard = makeDefender({ name: 'Boyz', toughness: 5, save: 5, wounds: 1, modelCount: 10, invulnerableSave: null, feelNoPain: null, keywords: ['Infantry'] });
    const leader = makeDefender({ name: 'Warboss', toughness: 5, save: 4, wounds: 6, modelCount: 1, keywords: ['Character'] });
    const pool = buildCombinedDefensePool(bodyguard, [leader]);
    const defender = flattenCombinedDefense(pool);

    expect(defender.toughness).toBe(5);
    expect(defender.save).toBe(5);
    expect(defender.wounds).toBe(16); // total wound pool
    expect(defender.modelCount).toBe(1); // single "super-model"
    expect(defender.keywords).toContain('Infantry');
    expect(defender.keywords).toContain('Character');
    expect(defender.modifiers).toEqual([]);
  });
});
