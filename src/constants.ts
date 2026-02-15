import type { UnitRole } from './types/army-list.ts';

export const ROLE_ORDER: UnitRole[] = [
  'characters',
  'battleline',
  'dedicated_transports',
  'other',
  'allied',
  'fortification',
];

export const ROLE_TITLES: Record<UnitRole, string> = {
  characters: 'Characters',
  battleline: 'Battleline',
  dedicated_transports: 'Dedicated Transports',
  other: 'Other Datasheets',
  allied: 'Allied Units',
  fortification: 'Fortifications',
};

export const MAX_LEADERS_PER_UNIT = 2;
