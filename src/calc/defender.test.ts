import { describe, it, expect } from 'vitest';
import { buildCustomDefender } from './defender.ts';

// Note: buildDefenderFromWahapedia requires loaded Wahapedia data,
// so it's tested indirectly through integration tests.
// Here we test the custom defender builder and edge cases.

describe('buildCustomDefender', () => {
  it('builds a defender with all stats', () => {
    const defender = buildCustomDefender('Intercessors', 4, 3, 5, 2, 5, null, ['Infantry', 'Imperium']);

    expect(defender.name).toBe('Intercessors');
    expect(defender.toughness).toBe(4);
    expect(defender.save).toBe(3);
    expect(defender.invulnerableSave).toBe(5);
    expect(defender.wounds).toBe(2);
    expect(defender.modelCount).toBe(5);
    expect(defender.feelNoPain).toBeNull();
    expect(defender.keywords).toEqual(['Infantry', 'Imperium']);
    expect(defender.modifiers).toEqual([]);
  });

  it('builds a defender with no invulnerable save', () => {
    const defender = buildCustomDefender('Guardsmen', 3, 5, null, 1, 10, null);

    expect(defender.invulnerableSave).toBeNull();
  });

  it('builds a defender with FNP', () => {
    const defender = buildCustomDefender('Plague Marines', 5, 3, null, 2, 5, 5);

    expect(defender.feelNoPain).toBe(5);
  });

  it('builds a defender with default empty keywords', () => {
    const defender = buildCustomDefender('Custom', 4, 3, null, 1, 1, null);

    expect(defender.keywords).toEqual([]);
  });

  it('builds a single-model defender (vehicle/monster)', () => {
    const defender = buildCustomDefender('Leman Russ', 11, 2, null, 13, 1, null, ['Vehicle']);

    expect(defender.toughness).toBe(11);
    expect(defender.wounds).toBe(13);
    expect(defender.modelCount).toBe(1);
  });

  it('builds a tough defender with everything', () => {
    const defender = buildCustomDefender(
      'Terminators', 5, 2, 4, 3, 5, 6, ['Infantry', 'Terminator'],
    );

    expect(defender.toughness).toBe(5);
    expect(defender.save).toBe(2);
    expect(defender.invulnerableSave).toBe(4);
    expect(defender.wounds).toBe(3);
    expect(defender.feelNoPain).toBe(6);
  });
});
