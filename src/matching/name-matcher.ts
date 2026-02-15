/**
 * Name matching utilities for resolving parsed names to Wahapedia data.
 */
import { normalizeName } from '../parser/normalize.ts';
import {
  getDatasheetByFactionAndName,
  getEnhancementByName,
  getFactionIdByName,
  getDetachmentByFactionAndName,
} from '../data/index.ts';
import type { WahapediaDatasheet, WahapediaDetachment, WahapediaEnhancement } from '../types/wahapedia.ts';

export function matchFactionId(factionName: string): string | null {
  return getFactionIdByName(factionName);
}

export function matchDatasheet(factionId: string, unitName: string): WahapediaDatasheet | null {
  // Try exact match first
  const ds = getDatasheetByFactionAndName(factionId, unitName);
  if (ds) return ds;

  // Try with smart quote normalization (normalize to straight quotes)
  const normalized = normalizeName(unitName);
  return getDatasheetByFactionAndName(factionId, normalized);
}

export function matchDetachment(factionId: string, detachmentName: string): WahapediaDetachment | null {
  return getDetachmentByFactionAndName(factionId, detachmentName);
}

export function matchEnhancement(factionId: string, enhancementName: string): WahapediaEnhancement | null {
  return getEnhancementByName(factionId, enhancementName);
}
