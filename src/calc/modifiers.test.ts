import { describe, it, expect } from 'vitest';
import {
  resolveOffensiveModifiers,
  resolveDefensiveModifiers,
  createCommonModifier,
  expandBundle,
  getActiveKeywords,
} from './modifiers.ts';
import type { Modifier, ModifierBundle, ParsedWeaponKeyword } from './types.ts';
import { makeContext } from './test-helpers.ts';

function mod(type: Modifier['type'], level: Modifier['level'] = 'army'): Modifier {
  return { id: 'test', source: 'test', level, type };
}

describe('resolveOffensiveModifiers', () => {
  const noKeywords: ParsedWeaponKeyword[] = [];

  it('returns defaults with no modifiers', () => {
    const result = resolveOffensiveModifiers([], [], [], [], noKeywords, makeContext());
    expect(result.hitRollModifier).toBe(0);
    expect(result.woundRollModifier).toBe(0);
    expect(result.rerollHits).toBe('none');
    expect(result.rerollWounds).toBe('none');
    expect(result.criticalHitThreshold).toBe(6);
  });

  it('sums hit roll modifiers from all levels', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'hit_roll_modifier', value: 1 }, 'army')],
      [mod({ category: 'hit_roll_modifier', value: 1 }, 'unit')],
      [], [], noKeywords, makeContext(),
    );
    // Clamped to +1
    expect(result.hitRollModifier).toBe(1);
  });

  it('clamps hit modifier to +1/-1', () => {
    const result = resolveOffensiveModifiers(
      [
        mod({ category: 'hit_roll_modifier', value: 1 }),
        mod({ category: 'hit_roll_modifier', value: 1 }),
      ],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.hitRollModifier).toBe(1);
  });

  it('clamps negative hit modifier to -1', () => {
    const result = resolveOffensiveModifiers(
      [
        mod({ category: 'hit_roll_modifier', value: -1 }),
        mod({ category: 'hit_roll_modifier', value: -1 }),
      ],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.hitRollModifier).toBe(-1);
  });

  it('all_failed reroll wins over ones', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'reroll_hits', scope: 'ones' })],
      [mod({ category: 'reroll_hits', scope: 'all_failed' })],
      [], [], noKeywords, makeContext(),
    );
    expect(result.rerollHits).toBe('all_failed');
  });

  it('ones reroll does not downgrade all_failed', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'reroll_hits', scope: 'all_failed' })],
      [mod({ category: 'reroll_hits', scope: 'ones' })],
      [], [], noKeywords, makeContext(),
    );
    expect(result.rerollHits).toBe('all_failed');
  });

  it('all_non_crit reroll wins over all_failed', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'reroll_hits', scope: 'all_failed' })],
      [mod({ category: 'reroll_hits', scope: 'all_non_crit' })],
      [], [], noKeywords, makeContext(),
    );
    expect(result.rerollHits).toBe('all_non_crit');
  });

  it('all_non_crit wound reroll resolves correctly', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'reroll_wounds', scope: 'all_non_crit' })],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.rerollWounds).toBe('all_non_crit');
  });

  it('Heavy keyword gives +1 hit if didNotMove', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'heavy' }];
    const result = resolveOffensiveModifiers(
      [], [], [], [], keywords, makeContext({ didNotMove: true }),
    );
    expect(result.hitRollModifier).toBe(1);
  });

  it('Heavy keyword does not apply if unit moved', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'heavy' }];
    const result = resolveOffensiveModifiers(
      [], [], [], [], keywords, makeContext({ didNotMove: false }),
    );
    expect(result.hitRollModifier).toBe(0);
  });

  it('Lance keyword gives +1 wound if isCharging', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'lance' }];
    const result = resolveOffensiveModifiers(
      [], [], [], [], keywords, makeContext({ isCharging: true }),
    );
    expect(result.woundRollModifier).toBe(1);
  });

  it('Twin-linked gives reroll all failed wounds', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'twin_linked' }];
    const result = resolveOffensiveModifiers(
      [], [], [], [], keywords, makeContext(),
    );
    expect(result.rerollWounds).toBe('all_failed');
  });

  it('sustained_hits modifier resolves', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'sustained_hits', value: 1 }, 'army')],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.sustainedHitsValue).toBe(1);
  });

  it('sustained_hits takes best value across keyword and modifier', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'sustained_hits', value: 1 }];
    const result = resolveOffensiveModifiers(
      [mod({ category: 'sustained_hits', value: 1 }, 'army')],
      [], [], [], keywords, makeContext(),
    );
    // Best of keyword 1 and modifier 1 = 1
    expect(result.sustainedHitsValue).toBe(1);
  });

  it('sustained_hits modifier upgrades keyword value when higher', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'sustained_hits', value: 1 }];
    const result = resolveOffensiveModifiers(
      [mod({ category: 'sustained_hits', value: 2 }, 'army')],
      [], [], [], keywords, makeContext(),
    );
    expect(result.sustainedHitsValue).toBe(2);
  });

  it('lethal_hits modifier resolves', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'lethal_hits' }, 'army')],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.hasLethalHits).toBe(true);
  });

  it('devastating_wounds modifier resolves', () => {
    const result = resolveOffensiveModifiers(
      [], [mod({ category: 'devastating_wounds' }, 'unit')],
      [], [], noKeywords, makeContext(),
    );
    expect(result.hasDevastatingWounds).toBe(true);
  });

  it('lethal_hits keyword sets hasLethalHits', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'lethal_hits' }];
    const result = resolveOffensiveModifiers(
      [], [], [], [], keywords, makeContext(),
    );
    expect(result.hasLethalHits).toBe(true);
  });

  it('devastating_wounds keyword sets hasDevastatingWounds', () => {
    const keywords: ParsedWeaponKeyword[] = [{ keyword: 'devastating_wounds' }];
    const result = resolveOffensiveModifiers(
      [], [], [], [], keywords, makeContext(),
    );
    expect(result.hasDevastatingWounds).toBe(true);
  });

  it('defaults have no sustained/lethal/dev', () => {
    const result = resolveOffensiveModifiers([], [], [], [], noKeywords, makeContext());
    expect(result.sustainedHitsValue).toBe(0);
    expect(result.hasLethalHits).toBe(false);
    expect(result.hasDevastatingWounds).toBe(false);
  });

  it('resolves bs_modifier', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'bs_modifier', value: 1 }, 'army')],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.bsModifier).toBe(1);
  });

  it('resolves ws_modifier', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'ws_modifier', value: -1 }, 'army')],
      [], [], [], noKeywords, makeContext(),
    );
    expect(result.wsModifier).toBe(-1);
  });

  it('bs/ws modifiers are not clamped to +1/-1', () => {
    const result = resolveOffensiveModifiers(
      [
        mod({ category: 'bs_modifier', value: 1 }, 'army'),
        mod({ category: 'bs_modifier', value: 1 }, 'unit'),
      ],
      [], [], [], noKeywords, makeContext(),
    );
    // Should be 2, NOT clamped to 1
    expect(result.bsModifier).toBe(2);
  });

  it('takes lowest critical hit threshold', () => {
    const result = resolveOffensiveModifiers(
      [mod({ category: 'critical_hit_threshold', value: 5 })],
      [mod({ category: 'critical_hit_threshold', value: 4 })],
      [], [], noKeywords, makeContext(),
    );
    expect(result.criticalHitThreshold).toBe(4);
  });
});

describe('resolveDefensiveModifiers', () => {
  it('returns defaults with no modifiers', () => {
    const result = resolveDefensiveModifiers([]);
    expect(result.saveModifier).toBe(0);
    expect(result.feelNoPain).toBeNull();
    expect(result.damageReduction).toBe(0);
    expect(result.invulnerableSave).toBeNull();
  });

  it('sums save modifiers (cover)', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'save_modifier', value: 1 }),
    ]);
    expect(result.saveModifier).toBe(1);
  });

  it('takes best (lowest) FNP', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'feel_no_pain', value: 6 }),
      mod({ category: 'feel_no_pain', value: 5 }),
    ]);
    expect(result.feelNoPain).toBe(5);
  });

  it('resolves damage reduction', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'damage_reduction', value: 1, minimum: 1 }),
    ]);
    expect(result.damageReduction).toBe(1);
    expect(result.damageMinimum).toBe(1);
  });

  it('takes best (lowest) invulnerable save override', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'invulnerable_save_override', value: 5 }),
      mod({ category: 'invulnerable_save_override', value: 4 }),
    ]);
    expect(result.invulnerableSave).toBe(4);
  });

  it('resolves hit_modifier_defense', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'hit_modifier_defense', value: -1 }),
    ]);
    expect(result.hitModifier).toBe(-1);
  });

  it('resolves wound_modifier_defense', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'wound_modifier_defense', value: -1 }),
    ]);
    expect(result.woundModifier).toBe(-1);
  });

  it('resolves half_damage', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'half_damage' }),
    ]);
    expect(result.halfDamage).toBe(true);
  });

  it('resolves reroll_saves', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'reroll_saves', scope: 'ones' }),
    ]);
    expect(result.rerollSaves).toBe('ones');
  });

  it('upgrades reroll_saves from ones to all_failed', () => {
    const result = resolveDefensiveModifiers([
      mod({ category: 'reroll_saves', scope: 'ones' }),
      mod({ category: 'reroll_saves', scope: 'all_failed' }),
    ]);
    expect(result.rerollSaves).toBe('all_failed');
  });
});

describe('createCommonModifier', () => {
  it('creates +1 hit modifier', () => {
    const m = createCommonModifier('plus_one_hit', 'army', 'test');
    expect(m.type.category).toBe('hit_roll_modifier');
    expect((m.type as { value: number }).value).toBe(1);
    expect(m.level).toBe('army');
  });

  it('creates cover modifier', () => {
    const m = createCommonModifier('cover', 'army', 'test');
    expect(m.type.category).toBe('save_modifier');
    expect((m.type as { value: number }).value).toBe(1);
  });

  it('creates sustained_hits_1 modifier', () => {
    const m = createCommonModifier('sustained_hits_1', 'army', 'test');
    expect(m.type.category).toBe('sustained_hits');
    expect((m.type as { value: number }).value).toBe(1);
  });

  it('creates lethal_hits modifier', () => {
    const m = createCommonModifier('lethal_hits', 'unit', 'test');
    expect(m.type.category).toBe('lethal_hits');
    expect(m.level).toBe('unit');
  });

  it('creates devastating_wounds modifier', () => {
    const m = createCommonModifier('devastating_wounds', 'weapon', 'test');
    expect(m.type.category).toBe('devastating_wounds');
  });

  it('creates plus_one_bs modifier', () => {
    const m = createCommonModifier('plus_one_bs', 'army', 'test');
    expect(m.type.category).toBe('bs_modifier');
    expect((m.type as { value: number }).value).toBe(1);
  });

  it('creates minus_one_ws modifier', () => {
    const m = createCommonModifier('minus_one_ws', 'army', 'test');
    expect(m.type.category).toBe('ws_modifier');
    expect((m.type as { value: number }).value).toBe(-1);
  });
});

describe('expandBundle', () => {
  it('expands bundle into individual modifiers with shared bundleId', () => {
    const bundle: ModifierBundle = {
      id: 'waaagh',
      name: 'Waaagh!',
      description: '+1S and +1A',
      side: 'attacker',
      level: 'army',
      modifiers: [
        { category: 'strength_modifier', value: 1 },
        { category: 'attacks_modifier', value: 1 },
      ],
    };

    const mods = expandBundle(bundle);
    expect(mods).toHaveLength(2);
    expect(mods[0].bundleId).toBe('waaagh');
    expect(mods[1].bundleId).toBe('waaagh');
    expect(mods[0].source).toBe('Waaagh!');
    expect(mods[0].level).toBe('army');
    expect(mods[0].type.category).toBe('strength_modifier');
    expect(mods[1].type.category).toBe('attacks_modifier');
  });
});

describe('getActiveKeywords', () => {
  it('returns all keywords when no overrides', () => {
    const keywords: ParsedWeaponKeyword[] = [
      { keyword: 'blast' },
      { keyword: 'heavy' },
    ];
    expect(getActiveKeywords(keywords, {})).toEqual(keywords);
  });

  it('filters out disabled keywords', () => {
    const keywords: ParsedWeaponKeyword[] = [
      { keyword: 'blast' },
      { keyword: 'heavy' },
    ];
    const result = getActiveKeywords(keywords, { blast: false });
    expect(result).toEqual([{ keyword: 'heavy' }]);
  });
});
