/** Parse weapon keyword strings into structured data */

import type { ParsedWeaponKeyword } from './types.ts';

/**
 * Parse a comma-separated keyword string (from EnrichedWeapon.keywords)
 * into an array of structured keyword objects.
 */
export function parseWeaponKeywords(keywordsStr: string): ParsedWeaponKeyword[] {
  if (!keywordsStr || keywordsStr.trim() === '-') return [];

  const results: ParsedWeaponKeyword[] = [];
  const tokens = keywordsStr.split(',').map(t => t.trim()).filter(Boolean);

  for (const token of tokens) {
    const parsed = parseKeywordToken(token);
    if (parsed) results.push(parsed);
  }

  return results;
}

function parseKeywordToken(token: string): ParsedWeaponKeyword | null {
  const lower = token.toLowerCase().trim();

  // Parameterized keywords
  const sustainedMatch = /^sustained hits (\d+)$/i.exec(token.trim());
  if (sustainedMatch) return { keyword: 'sustained_hits', value: parseInt(sustainedMatch[1], 10) };

  const antiMatch = /^anti-(.+?)\s+(\d+)\+$/i.exec(token.trim());
  if (antiMatch) return { keyword: 'anti', target: antiMatch[1], threshold: parseInt(antiMatch[2], 10) };

  const rapidFireMatch = /^rapid fire (\d+)$/i.exec(token.trim());
  if (rapidFireMatch) return { keyword: 'rapid_fire', value: parseInt(rapidFireMatch[1], 10) };

  const meltaMatch = /^melta (\d+)$/i.exec(token.trim());
  if (meltaMatch) return { keyword: 'melta', value: parseInt(meltaMatch[1], 10) };

  const extraAttacksMatch = /^extra attacks (\d+)$/i.exec(token.trim());
  if (extraAttacksMatch) return { keyword: 'extra_attacks', value: parseInt(extraAttacksMatch[1], 10) };

  // Simple keywords
  if (lower === 'lethal hits') return { keyword: 'lethal_hits' };
  if (lower === 'devastating wounds') return { keyword: 'devastating_wounds' };
  if (lower === 'twin-linked') return { keyword: 'twin_linked' };
  if (lower === 'torrent') return { keyword: 'torrent' };
  if (lower === 'blast') return { keyword: 'blast' };
  if (lower === 'heavy') return { keyword: 'heavy' };
  if (lower === 'ignores cover') return { keyword: 'ignores_cover' };
  if (lower === 'lance') return { keyword: 'lance' };
  if (lower === 'indirect fire') return { keyword: 'indirect_fire' };
  if (lower === 'pistol') return { keyword: 'pistol' };
  if (lower === 'assault') return { keyword: 'assault' };
  if (lower === 'hazardous') return { keyword: 'hazardous' };
  if (lower === 'precision') return { keyword: 'precision' };

  return null;
}

/**
 * Get a stable string key for a keyword (used for keywordOverrides map).
 */
export function getKeywordKey(kw: ParsedWeaponKeyword): string {
  switch (kw.keyword) {
    case 'sustained_hits': return `sustained_hits_${kw.value}`;
    case 'anti': return `anti_${kw.target}_${kw.threshold}`;
    case 'rapid_fire': return `rapid_fire_${kw.value}`;
    case 'melta': return `melta_${kw.value}`;
    case 'extra_attacks': return `extra_attacks_${kw.value}`;
    default: return kw.keyword;
  }
}

/**
 * Check if a keyword is active, considering overrides.
 */
export function isKeywordActive(
  kw: ParsedWeaponKeyword,
  overrides: Record<string, boolean>,
): boolean {
  const key = getKeywordKey(kw);
  if (key in overrides) return overrides[key];
  return true; // active by default
}

/**
 * Get a human-readable label for a keyword.
 */
export function getKeywordLabel(kw: ParsedWeaponKeyword): string {
  switch (kw.keyword) {
    case 'sustained_hits': return `Sustained Hits ${kw.value}`;
    case 'lethal_hits': return 'Lethal Hits';
    case 'devastating_wounds': return 'Devastating Wounds';
    case 'anti': return `Anti-${kw.target} ${kw.threshold}+`;
    case 'twin_linked': return 'Twin-linked';
    case 'torrent': return 'Torrent';
    case 'blast': return 'Blast';
    case 'heavy': return 'Heavy';
    case 'rapid_fire': return `Rapid Fire ${kw.value}`;
    case 'melta': return `Melta ${kw.value}`;
    case 'ignores_cover': return 'Ignores Cover';
    case 'lance': return 'Lance';
    case 'indirect_fire': return 'Indirect Fire';
    case 'pistol': return 'Pistol';
    case 'assault': return 'Assault';
    case 'hazardous': return 'Hazardous';
    case 'precision': return 'Precision';
    case 'extra_attacks': return `Extra Attacks ${kw.value}`;
  }
}
