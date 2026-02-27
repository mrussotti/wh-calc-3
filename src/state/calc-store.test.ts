import { describe, it, expect, beforeEach } from 'vitest';
import { useCalcStore } from './calc-store.ts';
import { useArmyStore } from './army-store.ts';
import type { EnrichedArmyList, EnrichedUnit, EnrichedWeapon } from '../types/enriched.ts';
import type { ModifierBundle } from '../calc/types.ts';

function makeWeapon(overrides: Partial<EnrichedWeapon> & { name: string }): EnrichedWeapon {
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

function makeUnit(overrides: Partial<EnrichedUnit> & { instanceId: string; name: string }): EnrichedUnit {
  return {
    displayName: overrides.name,
    datasheetId: null,
    role: 'other',
    points: 0,
    isWarlord: false,
    enhancement: null,
    equipment: [],
    modelStats: [],
    weapons: [],
    abilities: [],
    keywords: [],
    factionKeywords: [],
    isCharacter: false,
    leaderMapping: null,
    transportCapacity: null,
    modelCount: 1,
    modelCountByProfile: {},
    matchWarnings: [],
    ...overrides,
  };
}

function setupTestArmy(): void {
  const boyz = makeUnit({
    instanceId: 'boyz-1',
    name: 'Boyz',
    displayName: 'Boyz',
    modelCount: 10,
    weapons: [
      makeWeapon({ name: 'Slugga', count: 10, A: '1', BS_WS: '4+', type: 'ranged', range: '12"', keywords: 'Pistol' }),
      makeWeapon({ name: 'Choppa', count: 9, A: '3', BS_WS: '3+', S: '5', AP: '-1', type: 'melee', range: 'Melee' }),
    ],
    keywords: ['Infantry', 'Mob'],
  });

  const warboss = makeUnit({
    instanceId: 'warboss-1',
    name: 'Warboss',
    displayName: 'Warboss',
    modelCount: 1,
    isCharacter: true,
    leaderMapping: { canLead: ['Boyz'], isSecondaryLeader: false },
    weapons: [
      makeWeapon({ name: 'Big Choppa', count: 1, A: '4', BS_WS: '2+', S: '7', AP: '-1', D: '2', type: 'melee', range: 'Melee' }),
      makeWeapon({ name: 'Kombi-weapon', count: 1, A: '1', BS_WS: '4+', S: '4', AP: '0', D: '1', type: 'ranged', range: '24"' }),
    ],
  });

  const meganobz = makeUnit({
    instanceId: 'meganobz-1',
    name: 'Meganobz',
    displayName: 'Meganobz',
    modelCount: 3,
    weapons: [
      makeWeapon({ name: 'Kustom Shoota', count: 3, A: '4', BS_WS: '5+', type: 'ranged', range: '18"', keywords: 'Rapid Fire 1' }),
      makeWeapon({ name: 'Power Klaw', profileName: 'strike', count: 3, A: '3', BS_WS: '4+', S: '10', AP: '-2', D: '3', type: 'melee', range: 'Melee' }),
    ],
  });

  const army: EnrichedArmyList = {
    armyName: 'Test Army',
    factionId: 'ORK',
    factionName: 'Orks',
    detachment: null,
    factionAbility: null,
    gameSize: 'Strike Force',
    totalPoints: 500,
    units: [boyz, warboss, meganobz],
    parseWarnings: [],
  };

  useArmyStore.setState({ armyList: army });
}

beforeEach(() => {
  useCalcStore.getState().resetCalc();
  useArmyStore.setState({ leaderPairings: {}, transportAllocations: {} });
  setupTestArmy();
});

describe('attacker management', () => {
  it('adds an attacker unit from army', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');

    const state = useCalcStore.getState();
    expect(state.attackerConfigs).toHaveLength(1);
    expect(state.attackerConfigs[0].unitInstanceId).toBe('boyz-1');
    expect(state.attackerConfigs[0].unitName).toBe('Boyz');
    expect(state.attackerConfigs[0].weapons).toHaveLength(2);
  });

  it('prevents duplicate attacker units', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().addAttackerUnit('boyz-1');

    expect(useCalcStore.getState().attackerConfigs).toHaveLength(1);
  });

  it('removes an attacker unit', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().removeAttackerUnit('boyz-1');

    expect(useCalcStore.getState().attackerConfigs).toHaveLength(0);
  });

  it('reorders attacker units', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().addAttackerUnit('meganobz-1');

    useCalcStore.getState().reorderAttackerUnits(0, 1);

    const configs = useCalcStore.getState().attackerConfigs;
    expect(configs[0].unitInstanceId).toBe('meganobz-1');
    expect(configs[1].unitInstanceId).toBe('boyz-1');
  });

  it('merges paired leader weapons when adding bodyguard unit', () => {
    // Pair warboss to boyz
    useArmyStore.getState().setLeaderPairing('warboss-1', 'boyz-1');
    useCalcStore.getState().addAttackerUnit('boyz-1');

    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.unitInstanceId).toBe('boyz-1');
    // Boyz have 2 weapons + Warboss has 2 weapons = 4 total
    expect(config.weapons).toHaveLength(4);
    expect(config.unitName).toContain('Boyz');
    expect(config.unitName).toContain('Warboss');
    const weaponNames = config.weapons.map(w => w.weapon.name);
    expect(weaponNames).toContain('Big Choppa');
    expect(weaponNames).toContain('Kombi-weapon');
    expect(weaponNames).toContain('Slugga');
    expect(weaponNames).toContain('Choppa');
  });

  it('redirects paired character to bodyguard unit', () => {
    // Pair warboss to boyz, then try to add warboss directly
    useArmyStore.getState().setLeaderPairing('warboss-1', 'boyz-1');
    useCalcStore.getState().addAttackerUnit('warboss-1');

    const config = useCalcStore.getState().attackerConfigs[0];
    // Should redirect to the boyz unit (bodyguard)
    expect(config.unitInstanceId).toBe('boyz-1');
    expect(config.weapons).toHaveLength(4);
  });

  it('does not merge leader weapons when character is not paired', () => {
    // No pairing — add boyz alone
    useCalcStore.getState().addAttackerUnit('boyz-1');

    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.weapons).toHaveLength(2);
    expect(config.unitName).toBe('Boyz');
  });
});

describe('weapon toggling', () => {
  it('toggles weapon enabled/disabled', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().toggleWeapon('boyz-1', 'Slugga', null);

    const configs = useCalcStore.getState().attackerConfigs;
    const slugga = configs[0].weapons.find(w => w.weapon.name === 'Slugga');
    expect(slugga?.enabled).toBe(false);
  });

  it('toggles weapon keyword override', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().toggleWeaponKeyword('boyz-1', 'Slugga', null, 'pistol');

    const configs = useCalcStore.getState().attackerConfigs;
    const slugga = configs[0].weapons.find(w => w.weapon.name === 'Slugga');
    expect(slugga?.keywordOverrides['pistol']).toBe(false);
  });
});

describe('modifier management', () => {
  it('adds army-level modifier', () => {
    const mod = {
      id: 'test-mod',
      source: 'test',
      level: 'army' as const,
      type: { category: 'hit_roll_modifier' as const, value: 1 },
    };
    useCalcStore.getState().addModifier('army', '', mod);

    expect(useCalcStore.getState().armyModifiers).toHaveLength(1);
    expect(useCalcStore.getState().armyModifiers[0].id).toBe('test-mod');
  });

  it('removes army-level modifier', () => {
    const mod = {
      id: 'test-mod',
      source: 'test',
      level: 'army' as const,
      type: { category: 'hit_roll_modifier' as const, value: 1 },
    };
    useCalcStore.getState().addModifier('army', '', mod);
    useCalcStore.getState().removeModifier('army', '', 'test-mod');

    expect(useCalcStore.getState().armyModifiers).toHaveLength(0);
  });

  it('adds unit-level modifier', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    const mod = {
      id: 'unit-mod',
      source: 'test',
      level: 'unit' as const,
      type: { category: 'hit_roll_modifier' as const, value: 1 },
    };
    useCalcStore.getState().addModifier('unit', 'boyz-1', mod);

    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.modifiers).toHaveLength(1);
  });

  it('applies and removes bundle', () => {
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

    useCalcStore.getState().applyBundle(bundle);
    expect(useCalcStore.getState().armyModifiers).toHaveLength(2);
    expect(useCalcStore.getState().armyModifiers.every(m => m.bundleId === 'waaagh')).toBe(true);

    useCalcStore.getState().removeBundle('waaagh');
    expect(useCalcStore.getState().armyModifiers).toHaveLength(0);
  });
});

describe('defender management', () => {
  it('sets custom defender', () => {
    useCalcStore.getState().setDefenderCustom('Intercessors', 4, 3, null, 2, 5, null);

    const state = useCalcStore.getState();
    expect(state.defender).toEqual({ type: 'custom', profile: expect.any(Object) });
    expect(state.defenderProfile?.name).toBe('Intercessors');
    expect(state.defenderProfile?.toughness).toBe(4);
  });

  it('adds and removes defender modifier', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 5, null);

    const mod = {
      id: 'def-mod',
      source: 'cover',
      level: 'army' as const,
      type: { category: 'save_modifier' as const, value: 1 },
    };
    useCalcStore.getState().addDefenderModifier(mod);
    expect(useCalcStore.getState().defenderProfile?.modifiers).toHaveLength(1);

    useCalcStore.getState().removeDefenderModifier('def-mod');
    expect(useCalcStore.getState().defenderProfile?.modifiers).toHaveLength(0);
  });
});

describe('phase mode', () => {
  it('sets phase mode', () => {
    useCalcStore.getState().setPhaseMode('fighting');
    expect(useCalcStore.getState().phaseMode).toBe('fighting');
  });

  it('sets context', () => {
    useCalcStore.getState().setContext({ halfRange: true });
    expect(useCalcStore.getState().context.halfRange).toBe(true);
    expect(useCalcStore.getState().context.isCharging).toBe(false); // unchanged
  });
});

describe('recalculation', () => {
  it('produces null result with no attacker or defender', () => {
    useCalcStore.getState().recalculate();
    expect(useCalcStore.getState().lastResult).toBeNull();
  });

  it('produces result when attacker and defender are set', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null, ['Infantry']);

    const result = useCalcStore.getState().lastResult;
    expect(result).not.toBeNull();
    expect(result!.unitResults).toHaveLength(1);
    expect(result!.totalDamage).toBeGreaterThan(0);
  });

  it('updates result when weapon is toggled off', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);

    const resultBefore = useCalcStore.getState().lastResult;
    useCalcStore.getState().toggleWeapon('boyz-1', 'Slugga', null);
    const resultAfter = useCalcStore.getState().lastResult;

    // Damage should be different (less) with one weapon disabled
    expect(resultAfter!.totalDamage).toBeLessThan(resultBefore!.totalDamage);
  });
});

describe('source modifiers (leader sub-grouping)', () => {
  it('tags weapons with sources when leaders are paired', () => {
    useArmyStore.getState().setLeaderPairing('warboss-1', 'boyz-1');
    useCalcStore.getState().addAttackerUnit('boyz-1');

    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.sources).toHaveLength(2);
    expect(config.sources[0].sourceName).toBe('Boyz');
    expect(config.sources[0].isLeader).toBe(false);
    expect(config.sources[1].sourceName).toBe('Warboss');
    expect(config.sources[1].isLeader).toBe(true);

    // All weapons should have a source
    expect(config.weapons.every(w => w.source !== undefined)).toBe(true);
    // Boyz weapons tagged with boyz source
    const boyzWeapons = config.weapons.filter(w => w.source?.sourceId === 'boyz-1');
    expect(boyzWeapons).toHaveLength(2);
    // Warboss weapons tagged with warboss source
    const warbossWeapons = config.weapons.filter(w => w.source?.sourceId === 'warboss-1');
    expect(warbossWeapons).toHaveLength(2);
  });

  it('has no sources for solo units (no leaders)', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');

    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.sources).toHaveLength(0);
    expect(config.weapons.every(w => w.source === undefined)).toBe(true);
  });

  it('adds and removes source-level modifiers', () => {
    useArmyStore.getState().setLeaderPairing('warboss-1', 'boyz-1');
    useCalcStore.getState().addAttackerUnit('boyz-1');

    const mod = {
      id: 'src-mod-1',
      source: '+1 Hit',
      level: 'weapon' as const,
      type: { category: 'hit_roll_modifier' as const, value: 1 },
    };
    useCalcStore.getState().addSourceModifier('boyz-1', 'warboss-1', mod);

    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.sourceModifiers['warboss-1']).toHaveLength(1);
    expect(config.sourceModifiers['warboss-1'][0].id).toBe('src-mod-1');

    useCalcStore.getState().removeSourceModifier('boyz-1', 'warboss-1', 'src-mod-1');
    const config2 = useCalcStore.getState().attackerConfigs[0];
    expect(config2.sourceModifiers['warboss-1']).toHaveLength(0);
  });

  it('materializes source modifiers into weapon modifiers during recalculation', () => {
    useArmyStore.getState().setLeaderPairing('warboss-1', 'boyz-1');
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);

    const resultBefore = useCalcStore.getState().lastResult!;

    // Add +1 hit to warboss source only
    const mod = {
      id: 'src-mod-hit',
      source: '+1 Hit',
      level: 'weapon' as const,
      type: { category: 'hit_roll_modifier' as const, value: 1 },
    };
    useCalcStore.getState().addSourceModifier('boyz-1', 'warboss-1', mod);

    const resultAfter = useCalcStore.getState().lastResult!;
    // Damage should increase because warboss weapons got +1 hit
    expect(resultAfter.totalDamage).toBeGreaterThan(resultBefore.totalDamage);

    // But stored weapon modifiers should remain empty (materialization is transient)
    const config = useCalcStore.getState().attackerConfigs[0];
    expect(config.weapons.every(w => w.modifiers.length === 0)).toBe(true);
  });
});

describe('weapon stat overrides', () => {
  it('sets a weapon stat override', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'A', '3');

    const config = useCalcStore.getState().attackerConfigs[0];
    const slugga = config.weapons.find(w => w.weapon.name === 'Slugga');
    expect(slugga?.statOverrides?.A).toBe('3');
  });

  it('clears a single stat override by setting undefined', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'A', '3');
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'S', '8');
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'A', undefined);

    const config = useCalcStore.getState().attackerConfigs[0];
    const slugga = config.weapons.find(w => w.weapon.name === 'Slugga');
    expect(slugga?.statOverrides?.A).toBeUndefined();
    expect(slugga?.statOverrides?.S).toBe('8');
  });

  it('clears all weapon stat overrides', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'A', '3');
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'S', '8');
    useCalcStore.getState().clearWeaponStatOverrides('boyz-1', 'Slugga', null);

    const config = useCalcStore.getState().attackerConfigs[0];
    const slugga = config.weapons.find(w => w.weapon.name === 'Slugga');
    expect(slugga?.statOverrides).toBeUndefined();
  });

  it('weapon stat override affects calculation', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);

    const resultBefore = useCalcStore.getState().lastResult!;
    useCalcStore.getState().setWeaponStatOverride('boyz-1', 'Slugga', null, 'A', '10');
    const resultAfter = useCalcStore.getState().lastResult!;

    // More attacks = more damage
    expect(resultAfter.totalDamage).toBeGreaterThan(resultBefore.totalDamage);
  });
});

describe('defender stat overrides', () => {
  it('sets a defender stat override', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 5, null);
    useCalcStore.getState().setDefenderStatOverride('toughness', 8);

    expect(useCalcStore.getState().defenderStatOverrides?.toughness).toBe(8);
  });

  it('clears a single defender stat override', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 5, null);
    useCalcStore.getState().setDefenderStatOverride('toughness', 8);
    useCalcStore.getState().setDefenderStatOverride('save', 2);
    useCalcStore.getState().setDefenderStatOverride('toughness', undefined);

    const overrides = useCalcStore.getState().defenderStatOverrides;
    expect(overrides?.toughness).toBeUndefined();
    expect(overrides?.save).toBe(2);
  });

  it('clears all defender stat overrides', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 5, null);
    useCalcStore.getState().setDefenderStatOverride('toughness', 8);
    useCalcStore.getState().setDefenderStatOverride('save', 2);
    useCalcStore.getState().clearDefenderStatOverrides();

    expect(useCalcStore.getState().defenderStatOverrides).toBeNull();
  });

  it('defender stat override affects calculation', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);

    const resultBefore = useCalcStore.getState().lastResult!;
    // Override toughness to 10 — should reduce wounds
    useCalcStore.getState().setDefenderStatOverride('toughness', 10);
    const resultAfter = useCalcStore.getState().lastResult!;

    expect(resultAfter.totalDamage).toBeLessThan(resultBefore.totalDamage);
  });
});

describe('defender leader management', () => {
  it('adds a custom defender leader', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null, ['Infantry']);
    useCalcStore.getState().addDefenderLeaderCustom('Captain', 4, 2, 4, 5, null);

    const state = useCalcStore.getState();
    expect(state.defenderLeaderProfiles).toHaveLength(1);
    expect(state.defenderLeaderProfiles[0].name).toBe('Captain');
    expect(state.defenderLeaderProfiles[0].wounds).toBe(5);
    expect(state.defenderLeaderProfiles[0].modelCount).toBe(1);
  });

  it('enforces max 2 leaders', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);
    useCalcStore.getState().addDefenderLeaderCustom('Captain', 4, 2, 4, 5, null);
    useCalcStore.getState().addDefenderLeaderCustom('Lieutenant', 4, 3, null, 4, null);
    useCalcStore.getState().addDefenderLeaderCustom('Chaplain', 4, 3, null, 4, null);

    expect(useCalcStore.getState().defenderLeaderProfiles).toHaveLength(2);
    expect(useCalcStore.getState().defenderLeaderProfiles[0].name).toBe('Captain');
    expect(useCalcStore.getState().defenderLeaderProfiles[1].name).toBe('Lieutenant');
  });

  it('removes a defender leader by index', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);
    useCalcStore.getState().addDefenderLeaderCustom('Captain', 4, 2, 4, 5, null);
    useCalcStore.getState().addDefenderLeaderCustom('Lieutenant', 4, 3, null, 4, null);
    useCalcStore.getState().removeDefenderLeader(0);

    const profiles = useCalcStore.getState().defenderLeaderProfiles;
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Lieutenant');
  });

  it('clears leaders when defender changes via setDefenderCustom', () => {
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 10, null);
    useCalcStore.getState().addDefenderLeaderCustom('Captain', 4, 2, 4, 5, null);
    expect(useCalcStore.getState().defenderLeaderProfiles).toHaveLength(1);

    useCalcStore.getState().setDefenderCustom('New Target', 5, 4, null, 2, 5, null);
    expect(useCalcStore.getState().defenderLeaderProfiles).toHaveLength(0);
  });

  it('produces results with leader defense when leaders are attached', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Intercessors', 4, 3, null, 2, 5, null, ['Infantry']);
    useCalcStore.getState().addDefenderLeaderCustom('Captain', 4, 2, 4, 5, null);

    const result = useCalcStore.getState().lastResult;
    expect(result).not.toBeNull();
    expect(result!.defenderWoundTracker.bodyguardWoundsRemaining).toBeDefined();
    expect(result!.defenderWoundTracker.leaderWoundsRemaining).toBeDefined();
    expect(result!.defenderWoundTracker.initialBodyguardWounds).toBe(10); // 5 models * 2W
    expect(result!.defenderWoundTracker.initialLeaderWounds).toBe(5); // 1 model * 5W
  });
});

describe('reset', () => {
  it('resets all calc state', () => {
    useCalcStore.getState().addAttackerUnit('boyz-1');
    useCalcStore.getState().setDefenderCustom('Target', 4, 3, null, 1, 5, null);
    useCalcStore.getState().setPhaseMode('fighting');

    useCalcStore.getState().resetCalc();

    const state = useCalcStore.getState();
    expect(state.attackerConfigs).toHaveLength(0);
    expect(state.defender).toBeNull();
    expect(state.defenderProfile).toBeNull();
    expect(state.phaseMode).toBe('shooting');
    expect(state.lastResult).toBeNull();
    expect(state.armyModifiers).toHaveLength(0);
  });
});
