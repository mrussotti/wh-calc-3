import { describe, it, expect } from 'vitest';
import { parseDiceValue, resolveAverage, parseThreshold, resolveWeaponStat } from './dice.ts';

describe('parseDiceValue', () => {
  it('parses fixed numbers', () => {
    expect(parseDiceValue('4')).toEqual({ count: 0, sides: 0, modifier: 4 });
    expect(parseDiceValue('0')).toEqual({ count: 0, sides: 0, modifier: 0 });
    expect(parseDiceValue('12')).toEqual({ count: 0, sides: 0, modifier: 12 });
  });

  it('parses D6', () => {
    expect(parseDiceValue('D6')).toEqual({ count: 1, sides: 6, modifier: 0 });
  });

  it('parses D3', () => {
    expect(parseDiceValue('D3')).toEqual({ count: 1, sides: 3, modifier: 0 });
  });

  it('parses D3+1', () => {
    expect(parseDiceValue('D3+1')).toEqual({ count: 1, sides: 3, modifier: 1 });
  });

  it('parses 2D6', () => {
    expect(parseDiceValue('2D6')).toEqual({ count: 2, sides: 6, modifier: 0 });
  });

  it('parses 2D6+3', () => {
    expect(parseDiceValue('2D6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
  });

  it('is case insensitive', () => {
    expect(parseDiceValue('d6')).toEqual({ count: 1, sides: 6, modifier: 0 });
    expect(parseDiceValue('d3+1')).toEqual({ count: 1, sides: 3, modifier: 1 });
  });

  it('handles unparseable input as 0', () => {
    expect(parseDiceValue('abc')).toEqual({ count: 0, sides: 0, modifier: 0 });
  });
});

describe('resolveAverage', () => {
  it('returns fixed value for non-dice', () => {
    expect(resolveAverage({ count: 0, sides: 0, modifier: 4 })).toBe(4);
  });

  it('returns 3.5 for D6', () => {
    expect(resolveAverage({ count: 1, sides: 6, modifier: 0 })).toBe(3.5);
  });

  it('returns 2 for D3', () => {
    expect(resolveAverage({ count: 1, sides: 3, modifier: 0 })).toBe(2);
  });

  it('returns 3 for D3+1', () => {
    expect(resolveAverage({ count: 1, sides: 3, modifier: 1 })).toBe(3);
  });

  it('returns 7 for 2D6', () => {
    expect(resolveAverage({ count: 2, sides: 6, modifier: 0 })).toBe(7);
  });

  it('returns 10 for 2D6+3', () => {
    expect(resolveAverage({ count: 2, sides: 6, modifier: 3 })).toBe(10);
  });
});

describe('parseThreshold', () => {
  it('parses "3+" to 3', () => {
    expect(parseThreshold('3+')).toBe(3);
  });

  it('parses "4+" to 4', () => {
    expect(parseThreshold('4+')).toBe(4);
  });

  it('parses "2+" to 2', () => {
    expect(parseThreshold('2+')).toBe(2);
  });

  it('returns null for "-"', () => {
    expect(parseThreshold('-')).toBeNull();
  });

  it('returns null for "N/A"', () => {
    expect(parseThreshold('N/A')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseThreshold('')).toBeNull();
  });
});

describe('resolveWeaponStat', () => {
  it('resolves plain number', () => {
    expect(resolveWeaponStat('4')).toBe(4);
  });

  it('resolves D6 to average', () => {
    expect(resolveWeaponStat('D6')).toBe(3.5);
  });

  it('resolves D3+1 to average', () => {
    expect(resolveWeaponStat('D3+1')).toBe(3);
  });

  it('resolves "-" to 0', () => {
    expect(resolveWeaponStat('-')).toBe(0);
  });
});
