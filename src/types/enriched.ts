/** Enriched types — parsed army list merged with Wahapedia data */

import type { UnitRole } from './army-list.ts';

export interface ModelStats {
  name: string;
  M: string;
  T: string;
  Sv: string;
  invSv: string;
  W: string;
  Ld: string;
  OC: string;
}

export interface EnrichedWeapon {
  name: string;
  profileName: string | null;
  count: number;
  range: string;
  type: string;
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
  keywords: string;
}

export interface UnitAbility {
  name: string;
  description: string;
  type: 'core' | 'faction' | 'datasheet' | 'enhancement' | 'invulnerable' | 'other';
}

export interface TransportCapacity {
  baseCapacity: number;
  rawText: string;
  multipliers: { keyword: string; slots: number; matchType: 'keyword' | 'model' }[];
  exclusions: string[];
}

export interface LeaderMapping {
  canLead: string[];
  isSecondaryLeader: boolean;
}

export interface EnrichedUnit {
  instanceId: string;
  displayName: string;
  name: string;
  datasheetId: string | null;
  role: UnitRole;
  points: number;
  isWarlord: boolean;
  enhancement: {
    name: string;
    description: string;
  } | null;
  equipment: string[];
  modelStats: ModelStats[];
  weapons: EnrichedWeapon[];
  abilities: UnitAbility[];
  keywords: string[];
  factionKeywords: string[];
  isCharacter: boolean;
  leaderMapping: LeaderMapping | null;
  transportCapacity: TransportCapacity | null;
  modelCount: number;
  /** Maps lowercased Wahapedia profile name → count of that model in the unit */
  modelCountByProfile: Record<string, number>;
  matchWarnings: string[];
}

export interface FactionAbility {
  name: string;
  description: string;
}

export interface DetachmentInfo {
  detachmentId: string;
  name: string;
  ability: {
    name: string;
    description: string;
  } | null;
  stratagems: {
    name: string;
    type: string;
    cpCost: string;
    description: string;
    phase: string;
    turn: string;
  }[];
  enhancements: {
    name: string;
    description: string;
    cost: string;
  }[];
}

export interface EnrichedArmyList {
  armyName: string;
  factionId: string;
  factionName: string;
  detachment: DetachmentInfo | null;
  factionAbility: FactionAbility | null;
  gameSize: string;
  totalPoints: number;
  units: EnrichedUnit[];
  parseWarnings: string[];
}
