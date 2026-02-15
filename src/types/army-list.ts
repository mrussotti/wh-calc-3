/** Types for the parsed army list (output of the text parser) */

export type UnitRole = 'characters' | 'battleline' | 'dedicated_transports' | 'other' | 'allied' | 'fortification';

export interface ParsedWeapon {
  name: string;
  count: number;
}

export interface ParsedModel {
  name: string;
  count: number;
  weapons: ParsedWeapon[];
  isSubModel: boolean;
}

export interface ParsedUnit {
  id: string;
  name: string;
  role: UnitRole;
  points: number;
  isWarlord: boolean;
  enhancement: string | null;
  models: ParsedModel[];
  equipment: string[];
}

export interface ParsedArmyList {
  armyName: string;
  faction: string;
  detachment: string;
  gameSize: string;
  totalPoints: number;
  units: ParsedUnit[];
  parseWarnings: string[];
}
