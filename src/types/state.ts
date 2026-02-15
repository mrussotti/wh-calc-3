/** App state types for the Zustand store */

import type { EnrichedArmyList } from './enriched.ts';

export type ViewMode = 'card' | 'table';

export interface ArmyState {
  armyList: EnrichedArmyList | null;
  rawText: string;
  viewMode: ViewMode;
  expandedUnits: Set<string>;
  leaderPairings: Record<string, string[]>;
  transportAllocations: Record<string, string[]>;
  importError: string | null;
  isImporting: boolean;
}

export interface ArmyActions {
  importArmyList: (text: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  toggleUnitExpanded: (unitId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setLeaderPairing: (characterId: string, unitId: string | null) => void;
  removeLeaderPairing: (characterId: string) => void;
  assignToTransport: (unitId: string, transportId: string) => void;
  removeFromTransport: (unitId: string) => void;
  reset: () => void;
}

export type ArmyStore = ArmyState & ArmyActions;
