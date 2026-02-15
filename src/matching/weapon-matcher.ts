/**
 * Weapon matching — resolves parsed weapon names to Wahapedia wargear profiles.
 * Handles profile suffix matching (e.g., "Gork's Klaw" → "Gork's Klaw - strike" + "Gork's Klaw - sweep").
 */
import { normalizeName } from '../parser/normalize.ts';
import type { WahapediaWargear } from '../types/wahapedia.ts';
import type { EnrichedWeapon } from '../types/enriched.ts';
import type { ParsedWeapon } from '../types/army-list.ts';

export function matchWeapons(
  parsedWeapons: ParsedWeapon[],
  wargearList: WahapediaWargear[],
): EnrichedWeapon[] {
  const result: EnrichedWeapon[] = [];

  for (const pw of parsedWeapons) {
    const normalizedParsed = normalizeName(pw.name);
    const matched: WahapediaWargear[] = [];

    // Try exact match
    for (const wg of wargearList) {
      if (normalizeName(wg.name) === normalizedParsed) {
        matched.push(wg);
      }
    }

    // If no exact match, try profile suffix matching
    // e.g., "Gork's Klaw" matches "Gork's Klaw - strike" and "Gork's Klaw - sweep"
    if (matched.length === 0) {
      for (const wg of wargearList) {
        const normalizedWg = normalizeName(wg.name);
        if (normalizedWg.startsWith(normalizedParsed + ' - ') ||
            normalizedWg.startsWith(normalizedParsed + ' \u2013 ')) {
          matched.push(wg);
        }
      }
    }

    if (matched.length > 0) {
      for (const wg of matched) {
        const isProfile = normalizeName(wg.name) !== normalizedParsed;
        const profileName = isProfile ? extractProfileName(wg.name, pw.name) : null;

        result.push({
          name: pw.name,
          profileName,
          count: pw.count,
          range: wg.range ? `${wg.range}"` : 'Melee',
          type: wg.type,
          A: wg.A,
          BS_WS: wg.BS_WS ? `${wg.BS_WS}+` : '-',
          S: wg.S,
          AP: wg.AP === '0' ? '0' : wg.AP.startsWith('-') ? wg.AP : `-${wg.AP}`,
          D: wg.D,
          keywords: wg.description,
        });
      }
    } else {
      // No match — create a stub
      result.push({
        name: pw.name,
        profileName: null,
        count: pw.count,
        range: '-',
        type: '-',
        A: '-',
        BS_WS: '-',
        S: '-',
        AP: '-',
        D: '-',
        keywords: '',
      });
    }
  }

  return result;
}

function extractProfileName(fullName: string, baseName: string): string {
  // "Gork's Klaw - strike" with baseName "Gork's Klaw" → "strike"
  const normalizedFull = normalizeName(fullName);
  const normalizedBase = normalizeName(baseName);
  const suffix = normalizedFull.slice(normalizedBase.length).replace(/^\s*[-\u2013]\s*/, '');
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}
