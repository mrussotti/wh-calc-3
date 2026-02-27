import { describe, it, expect } from 'vitest';
import { parseWeaponKeywords, getKeywordKey, isKeywordActive, getKeywordLabel } from './weapon-keywords.ts';

describe('parseWeaponKeywords', () => {
  it('returns empty array for empty string', () => {
    expect(parseWeaponKeywords('')).toEqual([]);
  });

  it('returns empty array for "-"', () => {
    expect(parseWeaponKeywords('-')).toEqual([]);
  });

  it('parses Sustained Hits N', () => {
    const result = parseWeaponKeywords('Sustained Hits 2');
    expect(result).toEqual([{ keyword: 'sustained_hits', value: 2 }]);
  });

  it('parses Anti-X N+', () => {
    const result = parseWeaponKeywords('Anti-Infantry 4+');
    expect(result).toEqual([{ keyword: 'anti', target: 'Infantry', threshold: 4 }]);
  });

  it('parses Anti with multi-word target', () => {
    const result = parseWeaponKeywords('Anti-Fly 2+');
    expect(result).toEqual([{ keyword: 'anti', target: 'Fly', threshold: 2 }]);
  });

  it('parses Rapid Fire N', () => {
    const result = parseWeaponKeywords('Rapid Fire 1');
    expect(result).toEqual([{ keyword: 'rapid_fire', value: 1 }]);
  });

  it('parses Melta N', () => {
    const result = parseWeaponKeywords('Melta 2');
    expect(result).toEqual([{ keyword: 'melta', value: 2 }]);
  });

  it('parses Extra Attacks N', () => {
    const result = parseWeaponKeywords('Extra Attacks 1');
    expect(result).toEqual([{ keyword: 'extra_attacks', value: 1 }]);
  });

  it('parses simple keywords', () => {
    expect(parseWeaponKeywords('Lethal Hits')).toEqual([{ keyword: 'lethal_hits' }]);
    expect(parseWeaponKeywords('Devastating Wounds')).toEqual([{ keyword: 'devastating_wounds' }]);
    expect(parseWeaponKeywords('Twin-linked')).toEqual([{ keyword: 'twin_linked' }]);
    expect(parseWeaponKeywords('Torrent')).toEqual([{ keyword: 'torrent' }]);
    expect(parseWeaponKeywords('Blast')).toEqual([{ keyword: 'blast' }]);
    expect(parseWeaponKeywords('Heavy')).toEqual([{ keyword: 'heavy' }]);
    expect(parseWeaponKeywords('Ignores Cover')).toEqual([{ keyword: 'ignores_cover' }]);
    expect(parseWeaponKeywords('Lance')).toEqual([{ keyword: 'lance' }]);
    expect(parseWeaponKeywords('Indirect Fire')).toEqual([{ keyword: 'indirect_fire' }]);
    expect(parseWeaponKeywords('Pistol')).toEqual([{ keyword: 'pistol' }]);
    expect(parseWeaponKeywords('Assault')).toEqual([{ keyword: 'assault' }]);
    expect(parseWeaponKeywords('Hazardous')).toEqual([{ keyword: 'hazardous' }]);
    expect(parseWeaponKeywords('Precision')).toEqual([{ keyword: 'precision' }]);
  });

  it('parses multiple comma-separated keywords', () => {
    const result = parseWeaponKeywords('Rapid Fire 1, Anti-Infantry 4+, Heavy');
    expect(result).toEqual([
      { keyword: 'rapid_fire', value: 1 },
      { keyword: 'anti', target: 'Infantry', threshold: 4 },
      { keyword: 'heavy' },
    ]);
  });

  it('ignores unknown keywords', () => {
    const result = parseWeaponKeywords('Blast, Unknown Thing, Torrent');
    expect(result).toEqual([
      { keyword: 'blast' },
      { keyword: 'torrent' },
    ]);
  });

  it('handles whitespace around tokens', () => {
    const result = parseWeaponKeywords('  Blast ,  Heavy  ');
    expect(result).toEqual([
      { keyword: 'blast' },
      { keyword: 'heavy' },
    ]);
  });
});

describe('getKeywordKey', () => {
  it('returns keyword name for simple keywords', () => {
    expect(getKeywordKey({ keyword: 'blast' })).toBe('blast');
    expect(getKeywordKey({ keyword: 'lethal_hits' })).toBe('lethal_hits');
  });

  it('includes value for parameterized keywords', () => {
    expect(getKeywordKey({ keyword: 'sustained_hits', value: 2 })).toBe('sustained_hits_2');
    expect(getKeywordKey({ keyword: 'rapid_fire', value: 1 })).toBe('rapid_fire_1');
    expect(getKeywordKey({ keyword: 'melta', value: 2 })).toBe('melta_2');
  });

  it('includes target and threshold for Anti', () => {
    expect(getKeywordKey({ keyword: 'anti', target: 'Infantry', threshold: 4 }))
      .toBe('anti_Infantry_4');
  });
});

describe('isKeywordActive', () => {
  it('returns true by default', () => {
    expect(isKeywordActive({ keyword: 'blast' }, {})).toBe(true);
  });

  it('respects explicit override to false', () => {
    expect(isKeywordActive({ keyword: 'blast' }, { blast: false })).toBe(false);
  });

  it('respects explicit override to true', () => {
    expect(isKeywordActive({ keyword: 'blast' }, { blast: true })).toBe(true);
  });
});

describe('getKeywordLabel', () => {
  it('returns human-readable labels', () => {
    expect(getKeywordLabel({ keyword: 'sustained_hits', value: 2 })).toBe('Sustained Hits 2');
    expect(getKeywordLabel({ keyword: 'anti', target: 'Infantry', threshold: 4 })).toBe('Anti-Infantry 4+');
    expect(getKeywordLabel({ keyword: 'lethal_hits' })).toBe('Lethal Hits');
    expect(getKeywordLabel({ keyword: 'twin_linked' })).toBe('Twin-linked');
  });
});
