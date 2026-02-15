/**
 * Leader classifier — detects whether a character is a "secondary" leader
 * by scanning its ability text for phrases about attaching to units that
 * already have a character.
 */
import { getAbilities, getAbilityRef } from '../data/index.ts';
import { stripHtml } from '../parser/normalize.ts';

const SECONDARY_LEADER_PHRASES = [
  'already been attached',
  'already has a character',
  'already has a character unit',
  'even if one character',
  'even if a character',
  'can be attached as if',
  'can still be attached',
];

export function isSecondaryLeader(datasheetId: string): boolean {
  const abilities = getAbilities(datasheetId);

  for (const ab of abilities) {
    // Check inline description
    const desc = stripHtml(ab.description || '').toLowerCase();
    if (matchesSecondaryPhrase(desc)) return true;

    // Check referenced ability
    if (ab.ability_id) {
      const ref = getAbilityRef(ab.ability_id);
      if (ref) {
        const refDesc = stripHtml(ref.description || '').toLowerCase();
        if (matchesSecondaryPhrase(refDesc)) return true;
      }
    }

    // Check leader_footer on the datasheet (some phrases are there)
    if (ab.name) {
      const nameDesc = stripHtml(ab.name).toLowerCase();
      if (matchesSecondaryPhrase(nameDesc)) return true;
    }
  }

  return false;
}

function matchesSecondaryPhrase(text: string): boolean {
  return SECONDARY_LEADER_PHRASES.some(phrase => text.includes(phrase));
}
