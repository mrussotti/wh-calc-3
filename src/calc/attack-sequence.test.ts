import { describe, it, expect } from 'vitest';
import { getWoundThreshold, calculateWeaponAttack, calculateUnitAttack } from './attack-sequence.ts';
import {
  makeWeapon,
  makeWeaponConfig,
  makeDefender,
  makeAttackerConfig,
  makeContext,
  makeResolvedMods,
  makeResolvedDefMods,
} from './test-helpers.ts';

describe('getWoundThreshold', () => {
  it('S >= 2T -> 2+', () => {
    expect(getWoundThreshold(8, 4)).toBe(2);
    expect(getWoundThreshold(10, 5)).toBe(2);
  });

  it('S > T -> 3+', () => {
    expect(getWoundThreshold(5, 4)).toBe(3);
    expect(getWoundThreshold(6, 4)).toBe(3);
    expect(getWoundThreshold(7, 4)).toBe(3);
  });

  it('S == T -> 4+', () => {
    expect(getWoundThreshold(4, 4)).toBe(4);
  });

  it('S < T -> 5+', () => {
    expect(getWoundThreshold(3, 4)).toBe(5);
  });

  it('S <= T/2 -> 6+', () => {
    expect(getWoundThreshold(2, 4)).toBe(6);
    expect(getWoundThreshold(2, 5)).toBe(6);
    expect(getWoundThreshold(1, 4)).toBe(6);
  });
});

describe('calculateWeaponAttack', () => {
  it('basic attack: 10 shots, BS3+, S4 vs T4 Sv3+', () => {
    const weapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    expect(result.totalAttacks).toBe(10);
    // BS3+: 4/6 = 0.667 hit rate -> 6.67 hits
    expect(result.hits).toBeCloseTo(6.667, 1);
    // S4 vs T4: wound on 4+ -> 0.5 -> 3.33
    expect(result.wounds).toBeCloseTo(3.333, 1);
    // AP0 vs Sv3+: save on 3+ -> 4/6 save -> 1/3 fail -> ~1.11
    expect(result.unsavedWounds).toBeCloseTo(1.111, 1);
    expect(result.modelsKilled).toBeCloseTo(1.111, 1);
  });

  it('torrent auto-hits', () => {
    const weapon = makeWeapon({ name: 'Flamer', A: 'D6', BS_WS: '-', S: '4', AP: '0', D: '1', count: 1, keywords: 'Torrent' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender();
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // D6 average = 3.5 attacks, all auto-hit
    expect(result.totalAttacks).toBeCloseTo(3.5, 1);
    expect(result.hits).toBeCloseTo(3.5, 1);
    expect(result.criticalHits).toBe(0);
  });

  it('blast adds attacks based on target models', () => {
    const weapon = makeWeapon({ name: 'Blast Gun', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, keywords: 'Blast' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ modelCount: 11 }); // floor(11/5) = 2 extra attacks
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    expect(result.totalAttacks).toBe(3); // 1 + 2
  });

  it('rapid fire adds attacks at half range', () => {
    const weapon = makeWeapon({ name: 'RF Gun', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 2, keywords: 'Rapid Fire 1' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender();
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext({ halfRange: true });

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // 2 weapons * (1 base + 1 RF) = 4 attacks
    expect(result.totalAttacks).toBe(4);
  });

  it('rapid fire does not add attacks outside half range', () => {
    const weapon = makeWeapon({ name: 'RF Gun', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 2, keywords: 'Rapid Fire 1' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender();
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext({ halfRange: false });

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    expect(result.totalAttacks).toBe(2);
  });

  it('AP improves wound unsaved rate', () => {
    const weapon = makeWeapon({ name: 'AP Gun', A: '10', BS_WS: '3+', S: '8', AP: '-2', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // S8 vs T4 = 2+ to wound (5/6)
    // AP-2 modifies Sv3+ to Sv5+ -> fail on 1-4 = 4/6
    expect(result.unsavedWounds).toBeGreaterThan(3);
  });

  it('invulnerable save caps failing', () => {
    const weapon = makeWeapon({ name: 'Big Gun', A: '10', BS_WS: '2+', S: '10', AP: '-4', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    // Sv3+ with AP-4 = Sv7+ (auto-fail), but invuln 4+ saves on 4+
    const defender = makeDefender({ toughness: 4, save: 3, invulnerableSave: 4, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // With invuln 4+, half of wounds are saved
    // BS2+: ~8.33 hits, S10 vs T4 = 2+ wound: ~6.94, half unsaved = ~3.47
    expect(result.unsavedWounds).toBeCloseTo(3.472, 0);
  });

  it('devastating wounds bypass saves', () => {
    const weapon = makeWeapon({ name: 'Dev Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '2', count: 1, keywords: 'Devastating Wounds' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 2, invulnerableSave: 2, wounds: 2, modelCount: 5 });
    const offMods = makeResolvedMods({ hasDevastatingWounds: true });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // Critical wounds bypass saves entirely — some damage goes through even with 2+ save
    expect(result.unsavedWounds).toBeGreaterThan(0);
  });

  it('melta adds damage at half range', () => {
    const weapon = makeWeapon({ name: 'Melta', A: '1', BS_WS: '3+', S: '9', AP: '-4', D: 'D6', count: 1, keywords: 'Melta 2' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 6, modelCount: 1 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();

    const resultNormal = calculateWeaponAttack(wc, defender, offMods, defMods, makeContext({ halfRange: false }));
    const resultMelta = calculateWeaponAttack(wc, defender, offMods, defMods, makeContext({ halfRange: true }));

    // At half range, damage should be higher (D6 avg 3.5 + 2 = 5.5)
    expect(resultMelta.totalDamage).toBeGreaterThan(resultNormal.totalDamage);
  });

  it('FNP reduces effective damage', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10, feelNoPain: 5 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // FNP 5+: 2/6 of wounds ignored
    expect(result.damageAfterFnp).toBeLessThan(result.totalDamage);
    expect(result.damageAfterFnp).toBeCloseTo(result.totalDamage * (1 - 2 / 6), 1);
  });

  it('damage reduction applies with minimum', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '2', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 2, modelCount: 5 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods({ damageReduction: 1, damageMinimum: 1 });
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // D2 - 1 = D1 per wound
    // Without reduction, damage per wound would be 2
    const resultNoReduction = calculateWeaponAttack(wc, defender, offMods, makeResolvedDefMods(), ctx);
    expect(result.totalDamage).toBe(resultNoReduction.totalDamage / 2);
  });

  it('cover improves save', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '-1', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defModsNoCover = makeResolvedDefMods();
    const defModsCover = makeResolvedDefMods({ saveModifier: 1 });
    const ctx = makeContext();

    const resultNoCover = calculateWeaponAttack(wc, defender, offMods, defModsNoCover, ctx);
    const resultCover = calculateWeaponAttack(wc, defender, offMods, defModsCover, ctx);

    // Cover should reduce unsaved wounds
    expect(resultCover.unsavedWounds).toBeLessThan(resultNoCover.unsavedWounds);
  });

  it('ignores cover negates cover bonus', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '-1', D: '1', count: 1, keywords: 'Ignores Cover' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defModsCover = makeResolvedDefMods({ saveModifier: 1 });
    const ctx = makeContext();

    const resultCover = calculateWeaponAttack(wc, defender, offMods, defModsCover, ctx);

    // With Ignores Cover, the cover save modifier should not apply
    const weaponNoCoverKw = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '-1', D: '1', count: 1 });
    const wcNoCover = makeWeaponConfig(weaponNoCoverKw);
    const defModsNoCover = makeResolvedDefMods();
    const resultNoCover = calculateWeaponAttack(wcNoCover, defender, offMods, defModsNoCover, ctx);

    expect(resultCover.unsavedWounds).toBeCloseTo(resultNoCover.unsavedWounds, 2);
  });

  it('strength modifier applies to wound threshold', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offModsNoStr = makeResolvedMods();
    const offModsStr = makeResolvedMods({ strengthModifier: 1 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultBase = calculateWeaponAttack(wc, defender, offModsNoStr, defMods, ctx);
    const resultStr = calculateWeaponAttack(wc, defender, offModsStr, defMods, ctx);

    // S4+1=5 vs T4 = wound on 3+ (better than S4 vs T4 = 4+)
    expect(resultStr.wounds).toBeGreaterThan(resultBase.wounds);
  });

  it('extreme edge case: S2 vs T10', () => {
    const weapon = makeWeapon({ name: 'Weak', A: '10', BS_WS: '3+', S: '2', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 10, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // S2 <= T10/2 = 5 -> wound on 6+
    expect(result.wounds).toBeCloseTo(6.667 * (1 / 6), 1);
  });

  it('anti keyword lowers critical wound threshold against matching target', () => {
    const weapon = makeWeapon({ name: 'Anti Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, keywords: 'Anti-Infantry 4+' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10, keywords: ['Infantry'] });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultAnti = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // Without anti keyword
    const weaponNoAnti = makeWeapon({ name: 'No Anti', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wcNoAnti = makeWeaponConfig(weaponNoAnti);
    const resultNoAnti = calculateWeaponAttack(wcNoAnti, defender, offMods, defMods, ctx);

    // Anti should produce more critical wounds
    expect(resultAnti.criticalWounds).toBeGreaterThan(resultNoAnti.criticalWounds);
  });

  it('uses weapon stat overrides for attacks', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10 });
    const wc = makeWeaponConfig(weapon, { statOverrides: { A: '3' } });
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // 10 weapons * 3 attacks (overridden from 1) = 30 total attacks
    expect(result.totalAttacks).toBe(30);
  });

  it('uses weapon stat overrides for strength', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10 });
    const wcBase = makeWeaponConfig(weapon);
    const wcOverride = makeWeaponConfig(weapon, { statOverrides: { S: '8' } });
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultBase = calculateWeaponAttack(wcBase, defender, offMods, defMods, ctx);
    const resultOverride = calculateWeaponAttack(wcOverride, defender, offMods, defMods, ctx);

    // S8 vs T4 = 2+ wound, S4 vs T4 = 4+ wound — override should produce more wounds
    expect(resultOverride.wounds).toBeGreaterThan(resultBase.wounds);
  });

  it('uses weapon stat overrides for damage', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '8', AP: '0', D: '1', count: 1 });
    const wcBase = makeWeaponConfig(weapon);
    const wcOverride = makeWeaponConfig(weapon, { statOverrides: { D: '3' } });
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 3, modelCount: 5 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultBase = calculateWeaponAttack(wcBase, defender, offMods, defMods, ctx);
    const resultOverride = calculateWeaponAttack(wcOverride, defender, offMods, defMods, ctx);

    // D3 vs D1 — triple damage
    expect(resultOverride.totalDamage).toBeCloseTo(resultBase.totalDamage * 3, 1);
  });

  it('sustained hits generates extra hits on crits', () => {
    const weapon = makeWeapon({ name: 'SH Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, keywords: 'Sustained Hits 1' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods({ sustainedHitsValue: 1 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // 10 attacks, BS3+: ~1.67 crit hits generating 1 extra hit each
    // Total hits: 6.67 normal + 1.67 crit + 1.67 sustained = ~10
    expect(result.hits).toBeGreaterThan(6.667);
  });

  it('half damage reduces damage per wound (ceil rounding)', () => {
    const weapon = makeWeapon({ name: 'Big Gun', A: '10', BS_WS: '3+', S: '8', AP: '-4', D: '6', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 10, modelCount: 1 });
    const offMods = makeResolvedMods();
    const defModsNone = makeResolvedDefMods();
    const defModsHalf = makeResolvedDefMods({ halfDamage: true });
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offMods, defModsNone, ctx);
    const resultHalf = calculateWeaponAttack(wc, defender, offMods, defModsHalf, ctx);

    // D6 = 6 damage, halved ceil = 3 damage per wound
    expect(resultHalf.totalDamage).toBeCloseTo(resultNone.totalDamage / 2, 1);
  });

  it('half damage + -1 damage applied in correct order (halve first, then subtract)', () => {
    // D6=6 damage: halve first => ceil(6/2) = 3, then -1 => 2
    // If wrong order: 6-1=5, then ceil(5/2) = 3
    const weapon = makeWeapon({ name: 'Big Gun', A: '10', BS_WS: '2+', S: '10', AP: '-4', D: '6', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 10, modelCount: 1 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods({ halfDamage: true, damageReduction: 1, damageMinimum: 1 });
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // Half of 6 = 3, then -1 = 2. With just -1 dmg and no half, D=5.
    const resultJustReduction = calculateWeaponAttack(wc, defender, offMods, makeResolvedDefMods({ damageReduction: 1, damageMinimum: 1 }), ctx);
    // Result with both should be 2/5 of just-reduction result (2 dmg vs 5 dmg)
    expect(result.totalDamage).toBeCloseTo(resultJustReduction.totalDamage * (2 / 5), 1);
  });

  it('defender hit mod applies to hit calculation', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defModsNone = makeResolvedDefMods();
    const defModsStealth = makeResolvedDefMods({ hitModifier: -1 });
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offMods, defModsNone, ctx);
    const resultStealth = calculateWeaponAttack(wc, defender, offMods, defModsStealth, ctx);

    // -1 to hit makes BS3+ become BS4+, fewer hits
    expect(resultStealth.hits).toBeLessThan(resultNone.hits);
  });

  it('defender wound mod applies to wound calculation', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defModsNone = makeResolvedDefMods();
    const defModsWound = makeResolvedDefMods({ woundModifier: -1 });
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offMods, defModsNone, ctx);
    const resultWound = calculateWeaponAttack(wc, defender, offMods, defModsWound, ctx);

    // -1 to wound makes wound threshold harder, fewer wounds
    expect(resultWound.wounds).toBeLessThan(resultNone.wounds);
  });

  it('defender hit mod + attacker hit mod net correctly', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offModsPlus = makeResolvedMods({ hitRollModifier: 1 });
    const defModsMinus = makeResolvedDefMods({ hitModifier: -1 });
    const ctx = makeContext();

    // +1 attacker + -1 defender = net 0, should equal no modifiers
    const resultNet = calculateWeaponAttack(wc, defender, offModsPlus, defModsMinus, ctx);
    const resultBase = calculateWeaponAttack(wc, defender, makeResolvedMods(), makeResolvedDefMods(), ctx);

    expect(resultNet.hits).toBeCloseTo(resultBase.hits, 2);
  });

  it('reroll all saves reduces unsaved wounds', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defModsNone = makeResolvedDefMods();
    const defModsRR = makeResolvedDefMods({ rerollSaves: 'all_failed' });
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offMods, defModsNone, ctx);
    const resultRR = calculateWeaponAttack(wc, defender, offMods, defModsRR, ctx);

    expect(resultRR.unsavedWounds).toBeLessThan(resultNone.unsavedWounds);
  });

  it('reroll 1s saves partially reduces unsaved wounds', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defModsNone = makeResolvedDefMods();
    const defModsRR1 = makeResolvedDefMods({ rerollSaves: 'ones' });
    const defModsRRAll = makeResolvedDefMods({ rerollSaves: 'all_failed' });
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offMods, defModsNone, ctx);
    const resultRR1 = calculateWeaponAttack(wc, defender, offMods, defModsRR1, ctx);
    const resultRRAll = calculateWeaponAttack(wc, defender, offMods, defModsRRAll, ctx);

    // Reroll 1s should help, but less than reroll all
    expect(resultRR1.unsavedWounds).toBeLessThan(resultNone.unsavedWounds);
    expect(resultRR1.unsavedWounds).toBeGreaterThan(resultRRAll.unsavedWounds);
  });

  it('overwatch forces hits on 6 only', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctxNormal = makeContext();
    const ctxOverwatch = makeContext({ isOverwatch: true });

    const resultNormal = calculateWeaponAttack(wc, defender, offMods, defMods, ctxNormal);
    const resultOverwatch = calculateWeaponAttack(wc, defender, offMods, defMods, ctxOverwatch);

    // Overwatch: hits on 6 only = 1/6 hit rate, much lower than BS3+ = 4/6
    expect(resultOverwatch.hits).toBeCloseTo(10 / 6, 1);
    expect(resultOverwatch.hits).toBeLessThan(resultNormal.hits);
  });

  it('overwatch ignores hit modifiers', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offModsPlus = makeResolvedMods({ hitRollModifier: 1 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext({ isOverwatch: true });

    const resultNoMod = calculateWeaponAttack(wc, defender, makeResolvedMods(), defMods, ctx);
    const resultWithMod = calculateWeaponAttack(wc, defender, offModsPlus, defMods, ctx);

    // Hit modifier should not matter during overwatch
    expect(resultWithMod.hits).toBeCloseTo(resultNoMod.hits, 2);
  });

  it('precision weapon has precisionDamageAfterFnp equal to damageAfterFnp', () => {
    const weapon = makeWeapon({ name: 'Precision Gun', A: '10', BS_WS: '3+', S: '4', AP: '-1', D: '2', count: 1, keywords: 'Precision' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    expect(result.precisionDamageAfterFnp).toBe(result.damageAfterFnp);
    expect(result.precisionDamageAfterFnp).toBeGreaterThan(0);
  });

  it('fish reroll hits produces more crits than standard reroll', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 20 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultStandard = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollHits: 'all_failed' }), defMods, ctx);
    const resultFish = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollHits: 'all_non_crit' }), defMods, ctx);

    // Fishing produces more crits
    expect(resultFish.criticalHits).toBeGreaterThan(resultStandard.criticalHits);
    // But fewer total hits (sacrificed normal hits for crit chances)
    expect(resultFish.hits).toBeLessThan(resultStandard.hits);
  });

  it('fish reroll hits with sustained hits and BS2+ produces more total hits than standard', () => {
    // Fishing pays off when miss rate is low: at BS2+ there's little to gain from
    // rerolling misses, but rerolling non-crit successes generates more SH triggers
    const weapon = makeWeapon({ name: 'SH Gun', A: '20', BS_WS: '2+', S: '4', AP: '0', D: '1', count: 1, keywords: 'Sustained Hits 2' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 20 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultStandard = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollHits: 'all_failed', sustainedHitsValue: 2 }), defMods, ctx);
    const resultFish = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollHits: 'all_non_crit', sustainedHitsValue: 2 }), defMods, ctx);

    // BS2+ has only 1/6 misses — fishing sacrifices normal hits for way more sustained
    expect(resultFish.hits).toBeGreaterThan(resultStandard.hits);
    expect(resultFish.criticalHits).toBeGreaterThan(resultStandard.criticalHits);
  });

  it('fish reroll wounds produces more crit wounds', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 20 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultStandard = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollWounds: 'all_failed' }), defMods, ctx);
    const resultFish = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollWounds: 'all_non_crit' }), defMods, ctx);

    // Fishing produces more crit wounds
    expect(resultFish.criticalWounds).toBeGreaterThan(resultStandard.criticalWounds);
  });

  it('fish reroll wounds with dev wounds bypasses more saves', () => {
    // Dev wounds make crit wounds into mortal wounds (skip saves entirely)
    const weapon = makeWeapon({ name: 'Dev Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '2', count: 1, keywords: 'Devastating Wounds' });
    const wc = makeWeaponConfig(weapon);
    // Very high save — only mortal wounds from dev wounds will get through
    const defender = makeDefender({ toughness: 4, save: 2, invulnerableSave: 2, wounds: 2, modelCount: 10 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultStandard = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollWounds: 'all_failed', hasDevastatingWounds: true }), defMods, ctx);
    const resultFish = calculateWeaponAttack(wc, defender,
      makeResolvedMods({ rerollWounds: 'all_non_crit', hasDevastatingWounds: true }), defMods, ctx);

    // More dev wounds = more unsaved damage against high save targets
    expect(resultFish.unsavedWounds).toBeGreaterThan(resultStandard.unsavedWounds);
  });

  it('non-precision weapon has precisionDamageAfterFnp of 0', () => {
    const weapon = makeWeapon({ name: 'Normal Gun', A: '10', BS_WS: '3+', S: '4', AP: '-1', D: '2', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    expect(result.precisionDamageAfterFnp).toBe(0);
    expect(result.damageAfterFnp).toBeGreaterThan(0);
  });

  it('sustained hits via modifier (no keyword) generates extra hits', () => {
    const weapon = makeWeapon({ name: 'Plain Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const offMods = makeResolvedMods({ sustainedHitsValue: 1 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // 10 attacks, BS3+: ~1.67 crit hits generating 1 extra hit each
    // Total hits should be > 6.667 (base hits without sustained)
    expect(result.hits).toBeGreaterThan(6.667);
  });

  it('sustained hits keyword + modifier stack additively', () => {
    // Weapon has SH1 keyword, modifier adds SH1 => total SH2
    const weapon = makeWeapon({ name: 'SH Gun', A: '10', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1, keywords: 'Sustained Hits 1' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    // SH2 from modifier only (simulating keyword+modifier already resolved)
    const resultSH2 = calculateWeaponAttack(wc, defender, makeResolvedMods({ sustainedHitsValue: 2 }), defMods, ctx);
    const resultSH1 = calculateWeaponAttack(wc, defender, makeResolvedMods({ sustainedHitsValue: 1 }), defMods, ctx);

    // SH2 should generate more total hits than SH1
    expect(resultSH2.hits).toBeGreaterThan(resultSH1.hits);
  });

  it('lethal hits via modifier (no keyword) auto-wounds on crit hits', () => {
    const weapon = makeWeapon({ name: 'Plain Gun', A: '20', BS_WS: '3+', S: '2', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    // Very high toughness — wounds should still happen from lethal hits auto-wounding
    const defender = makeDefender({ toughness: 14, save: 6, wounds: 1, modelCount: 20 });
    const offModsNone = makeResolvedMods();
    const offModsLethal = makeResolvedMods({ hasLethalHits: true });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offModsNone, defMods, ctx);
    const resultLethal = calculateWeaponAttack(wc, defender, offModsLethal, defMods, ctx);

    // Lethal hits should produce more wounds overall
    expect(resultLethal.wounds).toBeGreaterThan(resultNone.wounds);
  });

  it('devastating wounds via modifier (no keyword) bypasses saves', () => {
    const weapon = makeWeapon({ name: 'Plain Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '2', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 2, invulnerableSave: 2, wounds: 2, modelCount: 10 });
    const offModsNone = makeResolvedMods();
    const offModsDev = makeResolvedMods({ hasDevastatingWounds: true });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultNone = calculateWeaponAttack(wc, defender, offModsNone, defMods, ctx);
    const resultDev = calculateWeaponAttack(wc, defender, offModsDev, defMods, ctx);

    // Dev wounds should bypass saves, producing more unsaved wounds against high save
    expect(resultDev.unsavedWounds).toBeGreaterThan(resultNone.unsavedWounds);
  });

  it('torrent still auto-hits during overwatch', () => {
    const weapon = makeWeapon({ name: 'Flamer', A: 'D6', BS_WS: '-', S: '4', AP: '0', D: '1', count: 1, keywords: 'Torrent' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender();
    const offMods = makeResolvedMods();
    const defMods = makeResolvedDefMods();
    const ctx = makeContext({ isOverwatch: true });

    const result = calculateWeaponAttack(wc, defender, offMods, defMods, ctx);

    // Torrent auto-hits even during overwatch
    expect(result.hits).toBeCloseTo(3.5, 1);
    expect(result.criticalHits).toBe(0);
  });

  // --- New: BS/WS modifier tests ---

  it('BS modifier adjusts hit threshold without +1/-1 clamping', () => {
    // +2 BS modifier should lower threshold from 4+ to 2+, unclamped
    const weapon = makeWeapon({ name: 'Gun', A: '10', BS_WS: '4+', S: '4', AP: '0', D: '1', count: 1, type: 'ranged' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultBase = calculateWeaponAttack(wc, defender, makeResolvedMods(), defMods, ctx);
    const resultBs2 = calculateWeaponAttack(wc, defender, makeResolvedMods({ bsModifier: 2 }), defMods, ctx);

    // +2 BS mod takes 4+ to 2+ (5/6 hit rate), much higher than 4+ (3/6)
    expect(resultBs2.hits).toBeGreaterThan(resultBase.hits);
    // Should approach 5/6 * 10 = 8.33 hits
    expect(resultBs2.hits).toBeCloseTo(8.333, 0);
  });

  it('WS modifier applies to melee weapons only', () => {
    const meleeWeapon = makeWeapon({ name: 'Sword', A: '10', BS_WS: '4+', S: '4', AP: '0', D: '1', count: 1, type: 'melee', range: 'Melee' });
    const wc = makeWeaponConfig(meleeWeapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    // WS modifier should improve melee hits
    const resultBase = calculateWeaponAttack(wc, defender, makeResolvedMods(), defMods, ctx);
    const resultWs = calculateWeaponAttack(wc, defender, makeResolvedMods({ wsModifier: 1 }), defMods, ctx);

    expect(resultWs.hits).toBeGreaterThan(resultBase.hits);
  });

  it('BS modifier does not affect melee weapons', () => {
    const meleeWeapon = makeWeapon({ name: 'Sword', A: '10', BS_WS: '4+', S: '4', AP: '0', D: '1', count: 1, type: 'melee', range: 'Melee' });
    const wc = makeWeaponConfig(meleeWeapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext();

    const resultBase = calculateWeaponAttack(wc, defender, makeResolvedMods(), defMods, ctx);
    const resultBs = calculateWeaponAttack(wc, defender, makeResolvedMods({ bsModifier: 1 }), defMods, ctx);

    // BS modifier should NOT change melee hits
    expect(resultBs.hits).toBeCloseTo(resultBase.hits, 2);
  });

  // --- New: Overwatch crit threshold and reroll tests ---

  it('overwatch with crit threshold 5+ produces more crits than default', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 20 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext({ isOverwatch: true });

    const resultDefault = calculateWeaponAttack(wc, defender, makeResolvedMods(), defMods, ctx);
    const resultCrit5 = calculateWeaponAttack(wc, defender, makeResolvedMods({ criticalHitThreshold: 5 }), defMods, ctx);

    // Crit threshold 5+ means more crits (5s and 6s vs just 6s)
    expect(resultCrit5.criticalHits).toBeGreaterThan(resultDefault.criticalHits);
  });

  it('overwatch with reroll hits produces more hits than default', () => {
    const weapon = makeWeapon({ name: 'Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 1 });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 20 });
    const defMods = makeResolvedDefMods();
    const ctx = makeContext({ isOverwatch: true });

    const resultDefault = calculateWeaponAttack(wc, defender, makeResolvedMods(), defMods, ctx);
    const resultReroll = calculateWeaponAttack(wc, defender, makeResolvedMods({ rerollHits: 'all_failed' }), defMods, ctx);

    // Rerolling misses should produce more hits
    expect(resultReroll.hits).toBeGreaterThan(resultDefault.hits);
  });

  // --- New: Dev wounds bypass damage modifications ---

  it('dev wounds bypass half damage', () => {
    // D6 weapon with dev wounds + half damage: dev wound damage should be unmodified
    const weapon = makeWeapon({ name: 'Dev Gun', A: '20', BS_WS: '3+', S: '4', AP: '0', D: '6', count: 1, keywords: 'Devastating Wounds' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 10, modelCount: 1 });
    const offModsDev = makeResolvedMods({ hasDevastatingWounds: true });
    const ctx = makeContext();

    const resultNoHalf = calculateWeaponAttack(wc, defender, offModsDev, makeResolvedDefMods(), ctx);
    const resultHalf = calculateWeaponAttack(wc, defender, offModsDev, makeResolvedDefMods({ halfDamage: true }), ctx);

    // With dev wounds, the dev wound portion bypasses half damage, so total damage with
    // half damage should be higher than exactly half of the no-half result
    // (because mortal wounds from dev wounds still deal full damage)
    expect(resultHalf.totalDamage).toBeGreaterThan(resultNoHalf.totalDamage / 2);
    // But still less than full damage (normal wounds are halved)
    expect(resultHalf.totalDamage).toBeLessThan(resultNoHalf.totalDamage);
  });

  // --- New: Melta after half damage ---

  it('melta damage added after half damage halving', () => {
    // D6=6 base damage with Melta 2: half first → ceil(6/2)=3, then +2 = 5
    // If melta were applied first: 6+2=8, half = ceil(8/2)=4
    const weapon = makeWeapon({ name: 'Melta', A: '10', BS_WS: '2+', S: '10', AP: '-4', D: '6', count: 1, keywords: 'Melta 2' });
    const wc = makeWeaponConfig(weapon);
    const defender = makeDefender({ toughness: 4, save: 6, wounds: 20, modelCount: 1 });
    const offMods = makeResolvedMods();
    const defModsHalf = makeResolvedDefMods({ halfDamage: true });
    const ctx = makeContext({ halfRange: true });

    const result = calculateWeaponAttack(wc, defender, offMods, defModsHalf, ctx);

    // Damage per wound should be ceil(6/2) + 2 = 5, not ceil(8/2) = 4
    // unsavedWounds * 5 = totalDamage
    const resultNoHalf = calculateWeaponAttack(wc, defender, offMods, makeResolvedDefMods(), ctx);
    // Without half: damage per wound = 6 + 2 = 8
    // With half: damage per wound = ceil(6/2) + 2 = 5
    // Ratio should be 5/8 = 0.625
    expect(result.totalDamage / resultNoHalf.totalDamage).toBeCloseTo(5 / 8, 1);
  });

  // --- New: Phase filter ---

  it('phase filter: melee-type weapon only appears in fighting phase', () => {
    const meleeWeapon = makeWeapon({ name: 'Choppa', A: '3', BS_WS: '3+', S: '5', AP: '-1', D: '1', count: 10, type: 'melee', range: 'Melee' });
    const rangedWeapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });

    const shootingConfig = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(meleeWeapon), makeWeaponConfig(rangedWeapon)],
    });

    const fightingConfig = makeAttackerConfig({
      phase: 'fighting',
      weapons: [makeWeaponConfig(meleeWeapon), makeWeaponConfig(rangedWeapon)],
    });

    const defender = makeDefender();
    const shootResult = calculateUnitAttack(shootingConfig, [], defender, makeContext());
    const fightResult = calculateUnitAttack(fightingConfig, [], defender, makeContext());

    // Shooting should only have Bolter
    expect(shootResult.weapons).toHaveLength(1);
    expect(shootResult.weapons[0].weaponName).toBe('Bolter');

    // Fighting should only have Choppa
    expect(fightResult.weapons).toHaveLength(1);
    expect(fightResult.weapons[0].weaponName).toBe('Choppa');
  });
});

describe('calculateUnitAttack', () => {
  it('calculates total damage across multiple weapons', () => {
    const rangedWeapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const meleeWeapon = makeWeapon({ name: 'Choppa', A: '3', BS_WS: '3+', S: '5', AP: '-1', D: '1', count: 10, type: 'melee', range: 'Melee' });

    const config = makeAttackerConfig({
      unitName: 'Boyz',
      phase: 'shooting',
      weapons: [
        makeWeaponConfig(rangedWeapon),
        makeWeaponConfig(meleeWeapon),
      ],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const ctx = makeContext();

    const result = calculateUnitAttack(config, [], defender, ctx);

    // Should only include ranged weapon in shooting phase
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0].weaponName).toBe('Bolter');
    expect(result.totalDamage).toBeGreaterThan(0);
  });

  it('includes only melee weapons in fighting phase', () => {
    const rangedWeapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const meleeWeapon = makeWeapon({ name: 'Choppa', A: '3', BS_WS: '3+', S: '5', AP: '-1', D: '1', count: 10, type: 'melee', range: 'Melee' });

    const config = makeAttackerConfig({
      unitName: 'Boyz',
      phase: 'fighting',
      weapons: [
        makeWeaponConfig(rangedWeapon),
        makeWeaponConfig(meleeWeapon),
      ],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });
    const ctx = makeContext();

    const result = calculateUnitAttack(config, [], defender, ctx);

    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0].weaponName).toBe('Choppa');
  });

  it('skips disabled weapons', () => {
    const weapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon, { enabled: false })],
    });

    const defender = makeDefender();
    const result = calculateUnitAttack(config, [], defender, makeContext());

    expect(result.weapons).toHaveLength(0);
    expect(result.totalDamage).toBe(0);
  });

  it('aggregates totalPrecisionDamageAfterFnp from precision weapons only', () => {
    const precisionWeapon = makeWeapon({ name: 'Sniper', A: '1', BS_WS: '3+', S: '5', AP: '-1', D: '2', count: 1, type: 'ranged', range: '36"', keywords: 'Precision' });
    const normalWeapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '3+', S: '4', AP: '0', D: '1', count: 5, type: 'ranged', range: '24"' });

    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [
        makeWeaponConfig(precisionWeapon),
        makeWeaponConfig(normalWeapon),
      ],
    });

    const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });
    const result = calculateUnitAttack(config, [], defender, makeContext());

    // Precision weapon contributes to totalPrecisionDamageAfterFnp
    expect(result.totalPrecisionDamageAfterFnp).toBeGreaterThan(0);
    // Total precision should be less than total damage (bolter does non-precision damage)
    expect(result.totalPrecisionDamageAfterFnp).toBeLessThan(result.totalDamageAfterFnp);
  });

  it('applies army-level modifiers', () => {
    const weapon = makeWeapon({ name: 'Bolter', A: '1', BS_WS: '4+', S: '4', AP: '0', D: '1', count: 10, type: 'ranged', range: '24"' });
    const config = makeAttackerConfig({
      phase: 'shooting',
      weapons: [makeWeaponConfig(weapon)],
    });

    const defender = makeDefender({ toughness: 4, save: 6, wounds: 1, modelCount: 10 });
    const armyMod = {
      id: 'test',
      source: 'test',
      level: 'army' as const,
      type: { category: 'hit_roll_modifier' as const, value: 1 },
    };

    const resultNoMod = calculateUnitAttack(config, [], defender, makeContext());
    const resultMod = calculateUnitAttack(config, [armyMod], defender, makeContext());

    // +1 to hit should produce more hits
    expect(resultMod.totalDamage).toBeGreaterThan(resultNoMod.totalDamage);
  });
});
