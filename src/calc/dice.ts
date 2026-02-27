/** Dice notation parsing and average resolution */

import type { DiceValue } from './types.ts';

/**
 * Parse dice notation string into structured DiceValue.
 * Supports: "4", "D6", "D3", "D3+1", "2D6", "D6+3", etc.
 */
export function parseDiceValue(notation: string): DiceValue {
  const s = notation.trim().toUpperCase();

  // Fixed number: "4", "0", "12"
  const fixedMatch = /^(\d+)$/.exec(s);
  if (fixedMatch) {
    return { count: 0, sides: 0, modifier: parseInt(fixedMatch[1], 10) };
  }

  // Dice notation: "D6", "D3", "2D6", "D6+1", "2D6+3", "D3+1"
  const diceMatch = /^(\d*)D(\d+)([+-]\d+)?$/.exec(s);
  if (diceMatch) {
    const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
    const sides = parseInt(diceMatch[2], 10);
    const modifier = diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;
    return { count, sides, modifier };
  }

  // Fallback: try parsing as number
  const num = parseInt(s, 10);
  if (!isNaN(num)) {
    return { count: 0, sides: 0, modifier: num };
  }

  // Can't parse — treat as 0
  return { count: 0, sides: 0, modifier: 0 };
}

/** Resolve a DiceValue to its average */
export function resolveAverage(value: DiceValue): number {
  if (value.count === 0) return value.modifier;
  const avg = (value.sides + 1) / 2;
  return value.count * avg + value.modifier;
}

/**
 * Parse a threshold stat like "3+" -> 3, "4+" -> 4, "-" -> null, "N/A" -> null
 */
export function parseThreshold(stat: string): number | null {
  const s = stat.trim();
  if (s === '-' || s === 'N/A' || s === '') return null;
  const match = /^(\d+)\+$/.exec(s);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Resolve a weapon stat string to its average numeric value.
 * Handles dice notation ("D6", "2D3+1") and plain numbers ("4").
 */
export function resolveWeaponStat(stat: string): number {
  const s = stat.trim();
  if (s === '-' || s === '') return 0;
  // Strip trailing '+' that threshold stats might have
  const cleaned = s.replace(/\+$/, '');
  return resolveAverage(parseDiceValue(cleaned));
}
