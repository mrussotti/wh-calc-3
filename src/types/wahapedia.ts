/** Raw types matching Wahapedia CSV column structure */

export interface WahapediaFaction {
  id: string;
  name: string;
  link: string;
}

export interface WahapediaDetachment {
  id: string;
  faction_id: string;
  name: string;
  legend: string;
  type: string;
}

export interface WahapediaDatasheet {
  id: string;
  name: string;
  faction_id: string;
  source_id: string;
  legend: string;
  role: string;
  loadout: string;
  transport: string;
  virtual: string;
  leader_head: string;
  leader_footer: string;
  damaged_w: string;
  damaged_description: string;
  link: string;
}

export interface WahapediaModel {
  datasheet_id: string;
  line: string;
  name: string;
  M: string;
  T: string;
  Sv: string;
  inv_sv: string;
  inv_sv_descr: string;
  W: string;
  Ld: string;
  OC: string;
  base_size: string;
  base_size_descr: string;
}

export interface WahapediaWargear {
  datasheet_id: string;
  line: string;
  line_in_wargear: string;
  dice: string;
  name: string;
  description: string;
  range: string;
  type: string;
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
}

export interface WahapediaAbility {
  datasheet_id: string;
  line: string;
  ability_id: string;
  model: string;
  name: string;
  description: string;
  type: string;
  parameter: string;
}

export interface WahapediaKeyword {
  datasheet_id: string;
  keyword: string;
  model: string;
  is_faction_keyword: string;
}

export interface WahapediaLeader {
  leader_id: string;
  attached_id: string;
}

export interface WahapediaEnhancement {
  faction_id: string;
  id: string;
  name: string;
  cost: string;
  detachment: string;
  detachment_id: string;
  legend: string;
  description: string;
}

export interface WahapediaDetachmentAbility {
  id: string;
  faction_id: string;
  name: string;
  legend: string;
  description: string;
  detachment: string;
  detachment_id: string;
}

export interface WahapediaStratagem {
  faction_id: string;
  name: string;
  id: string;
  type: string;
  cp_cost: string;
  legend: string;
  turn: string;
  phase: string;
  detachment: string;
  detachment_id: string;
  description: string;
}

export interface WahapediaAbilityRef {
  id: string;
  name: string;
  legend: string;
  faction_id: string;
  description: string;
}

/** Indexed data structure for the generated JSON files */
export interface WahapediaData {
  factions: Record<string, WahapediaFaction>;
  detachments: Record<string, WahapediaDetachment>;
  datasheets: Record<string, WahapediaDatasheet>;
  models: Record<string, WahapediaModel[]>;
  wargear: Record<string, WahapediaWargear[]>;
  abilities: Record<string, WahapediaAbility[]>;
  keywords: Record<string, WahapediaKeyword[]>;
  leaders: Record<string, string[]>;
  enhancements: Record<string, WahapediaEnhancement[]>;
  detachmentAbilities: Record<string, WahapediaDetachmentAbility[]>;
  stratagems: Record<string, WahapediaStratagem[]>;
  abilityRefs: Record<string, WahapediaAbilityRef>;
  /** Maps faction_id → normalized_name → datasheet_id */
  datasheetIndex: Record<string, Record<string, string>>;
  lastUpdate: string;
}
