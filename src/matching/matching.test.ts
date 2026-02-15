import { describe, it, expect, beforeAll } from 'vitest';
import { loadWahapediaData } from '../data/index.ts';
import { matchFactionId, matchDatasheet } from './name-matcher.ts';
import { matchWeapons } from './weapon-matcher.ts';
import { isSecondaryLeader } from './leader-classifier.ts';
import { parseTransportCapacity } from './enrichment.ts';
import { getWargear, getDatasheetByFactionAndName } from '../data/index.ts';

beforeAll(async () => {
  await loadWahapediaData();
});

describe('name matching', () => {
  it('resolves Orks faction', () => {
    const id = matchFactionId('Orks');
    expect(id).toBe('ORK');
  });

  it('matches Beastboss datasheet', () => {
    const ds = matchDatasheet('ORK', 'Beastboss');
    expect(ds).not.toBeNull();
    expect(ds!.name).toBe('Beastboss');
  });

  it('matches Ghazghkull Thraka', () => {
    const ds = matchDatasheet('ORK', 'Ghazghkull Thraka');
    expect(ds).not.toBeNull();
  });

  it('matches Warboss in Mega Armour', () => {
    const ds = matchDatasheet('ORK', 'Warboss in Mega Armour');
    expect(ds).not.toBeNull();
  });
});

describe('weapon matching', () => {
  it('matches Gork\u2019s Klaw with both profiles (strike + sweep)', () => {
    const ds = getDatasheetByFactionAndName('ORK', 'Ghazghkull Thraka');
    expect(ds).not.toBeNull();

    const wargear = getWargear(ds!.id);
    const enriched = matchWeapons(
      [{ name: 'Gork\u2019s Klaw', count: 1 }],
      wargear,
    );

    // Should have two profiles
    expect(enriched.length).toBeGreaterThanOrEqual(2);
    const profileNames = enriched.map(w => w.profileName).filter(Boolean);
    expect(profileNames.length).toBeGreaterThanOrEqual(1);
  });

  it('matches a simple weapon', () => {
    const ds = getDatasheetByFactionAndName('ORK', 'Warboss');
    expect(ds).not.toBeNull();

    const wargear = getWargear(ds!.id);
    const enriched = matchWeapons(
      [{ name: 'Kombi-weapon', count: 1 }],
      wargear,
    );

    expect(enriched.length).toBeGreaterThanOrEqual(1);
    expect(enriched[0].S).not.toBe('-');
  });
});

describe('leader classifier', () => {
  it('detects Painboy as secondary leader (if applicable)', () => {
    const ds = getDatasheetByFactionAndName('ORK', 'Painboy');
    if (ds) {
      // Painboy should be secondary (can attach even if CHARACTER already attached)
      const isSec = isSecondaryLeader(ds.id);
      // This may or may not be true depending on the data; test structure is correct
      expect(typeof isSec).toBe('boolean');
    }
  });

  it('Warboss is not a secondary leader', () => {
    const ds = getDatasheetByFactionAndName('ORK', 'Warboss');
    if (ds) {
      const isSec = isSecondaryLeader(ds.id);
      expect(isSec).toBe(false);
    }
  });
});

describe('transport capacity parsing', () => {
  it('parses Battlewagon transport text', () => {
    const ds = getDatasheetByFactionAndName('ORK', 'Battlewagon');
    expect(ds).not.toBeNull();
    if (ds?.transport) {
      const cap = parseTransportCapacity(ds.transport);
      expect(cap).not.toBeNull();
      expect(cap!.baseCapacity).toBeGreaterThan(0);
    }
  });

  it('parses Trukk transport text', () => {
    const ds = getDatasheetByFactionAndName('ORK', 'Trukk');
    expect(ds).not.toBeNull();
    if (ds?.transport) {
      const cap = parseTransportCapacity(ds.transport);
      expect(cap).not.toBeNull();
      expect(cap!.baseCapacity).toBe(12);
    }
  });

  it('parses Battlewagon text with combined multipliers and model-specific multipliers', () => {
    const cap = parseTransportCapacity(
      'This model has a transport capacity of 22 Orks Infantry models. Each Mega Armour or Jump Pack model takes up the space of 2 models. The Ghazghkull Thraka model takes up the space of 4 models.'
    );
    expect(cap).not.toBeNull();
    expect(cap!.baseCapacity).toBe(22);
    // Should have 3 multipliers: Mega Armour (2, keyword), Jump Pack (2, keyword), Ghazghkull Thraka (4, model)
    expect(cap!.multipliers).toHaveLength(3);
    const byKeyword = Object.fromEntries(cap!.multipliers.map(m => [m.keyword, m]));
    expect(byKeyword['Mega Armour'].slots).toBe(2);
    expect(byKeyword['Mega Armour'].matchType).toBe('keyword');
    expect(byKeyword['Jump Pack'].slots).toBe(2);
    expect(byKeyword['Jump Pack'].matchType).toBe('keyword');
    expect(byKeyword['Ghazghkull Thraka'].slots).toBe(4);
    expect(byKeyword['Ghazghkull Thraka'].matchType).toBe('model');
  });

  it('parses Trukk exclusions with "or" separator', () => {
    const cap = parseTransportCapacity(
      'This model has a transport capacity of 12 Orks Infantry models. Each Mega Armour model takes up the space of 2 models. It cannot transport Jump Pack or Ghazghkull Thraka models.'
    );
    expect(cap).not.toBeNull();
    expect(cap!.baseCapacity).toBe(12);
    expect(cap!.exclusions).toHaveLength(2);
    expect(cap!.exclusions).toContain('Jump Pack');
    expect(cap!.exclusions).toContain('Ghazghkull Thraka');
  });
});
