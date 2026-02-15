import { describe, it, expect, beforeEach } from 'vitest';
import { useArmyStore, getCharacterPairedUnit, getUnitTransport, getTransportUsedCapacity, getEligibleUnitsForLeader } from './army-store.ts';
import type { EnrichedArmyList, EnrichedUnit } from '../types/enriched.ts';
import { MAX_LEADERS_PER_UNIT } from '../constants.ts';

/** Build a minimal EnrichedUnit with defaults */
function makeUnit(overrides: Partial<EnrichedUnit> & { instanceId: string; name: string }): EnrichedUnit {
  return {
    displayName: overrides.name,
    datasheetId: null,
    role: 'other',
    points: 0,
    isWarlord: false,
    enhancement: null,
    equipment: [],
    modelStats: [],
    weapons: [],
    abilities: [],
    keywords: [],
    factionKeywords: [],
    isCharacter: false,
    leaderMapping: null,
    transportCapacity: null,
    modelCount: 1,
    modelCountByProfile: {},
    matchWarnings: [],
    ...overrides,
  };
}

function buildTestArmy(): EnrichedArmyList {
  const primaryLeader = makeUnit({
    instanceId: 'char-primary',
    name: 'Warboss',
    role: 'characters',
    isCharacter: true,
    modelCount: 1,
    modelStats: [{ name: 'Warboss', M: '6"', T: '5', Sv: '4+', invSv: '5+', W: '6', Ld: '6+', OC: '1' }],
    modelCountByProfile: { warboss: 1 },
    leaderMapping: { canLead: ['Boyz'], isSecondaryLeader: false },
  });

  const secondaryLeader = makeUnit({
    instanceId: 'char-secondary',
    name: 'Painboy',
    role: 'characters',
    isCharacter: true,
    modelCount: 1,
    modelStats: [{ name: 'Painboy', M: '6"', T: '5', Sv: '4+', invSv: '-', W: '4', Ld: '6+', OC: '1' }],
    modelCountByProfile: { painboy: 1 },
    leaderMapping: { canLead: ['Boyz'], isSecondaryLeader: true },
  });

  const boyz1 = makeUnit({
    instanceId: 'boyz-1',
    name: 'Boyz',
    displayName: 'Boyz #1',
    role: 'battleline',
    modelCount: 10,
    modelStats: [{ name: 'Boy', M: '6"', T: '5', Sv: '5+', invSv: '-', W: '1', Ld: '7+', OC: '2' }],
    modelCountByProfile: { boy: 10 },
    keywords: ['Infantry', 'Mob'],
  });

  const boyz2 = makeUnit({
    instanceId: 'boyz-2',
    name: 'Boyz',
    displayName: 'Boyz #2',
    role: 'battleline',
    modelCount: 10,
    modelStats: [{ name: 'Boy', M: '6"', T: '5', Sv: '5+', invSv: '-', W: '1', Ld: '7+', OC: '2' }],
    modelCountByProfile: { boy: 10 },
    keywords: ['Infantry', 'Mob'],
  });

  const trukk = makeUnit({
    instanceId: 'trukk-1',
    name: 'Trukk',
    role: 'dedicated_transports',
    modelCount: 1,
    transportCapacity: {
      baseCapacity: 12,
      rawText: 'transport capacity of 12',
      multipliers: [],
      exclusions: ['Jump Pack'],
    },
  });

  const stormboyz = makeUnit({
    instanceId: 'stormboyz-1',
    name: 'Stormboyz',
    role: 'other',
    modelCount: 5,
    modelStats: [{ name: 'Stormboy', M: '12"', T: '5', Sv: '5+', invSv: '-', W: '1', Ld: '7+', OC: '1' }],
    modelCountByProfile: { stormboy: 5 },
    keywords: ['Infantry', 'Jump Pack'],
  });

  return {
    armyName: 'Test Army',
    factionId: 'ORK',
    factionName: 'Orks',
    detachment: null,
    factionAbility: null,
    gameSize: 'Strike Force',
    totalPoints: 500,
    units: [primaryLeader, secondaryLeader, boyz1, boyz2, trukk, stormboyz],
    parseWarnings: [],
  };
}

function resetStore(army?: EnrichedArmyList) {
  useArmyStore.setState({
    armyList: army ?? buildTestArmy(),
    rawText: '',
    viewMode: 'card',
    expandedUnits: new Set(),
    leaderPairings: {},
    transportAllocations: {},
    importError: null,
    isImporting: false,
  });
}

beforeEach(() => {
  resetStore();
});

// === Leader Pairing Tests ===

describe('leader pairing', () => {
  it('pairs character to eligible unit', () => {
    const { setLeaderPairing } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');

    const state = useArmyStore.getState();
    expect(state.leaderPairings['boyz-1']).toEqual(['char-primary']);
  });

  it('rejects pairing to ineligible unit', () => {
    const { setLeaderPairing } = useArmyStore.getState();
    // Stormboyz is not in the canLead list
    setLeaderPairing('char-primary', 'stormboyz-1');

    const state = useArmyStore.getState();
    expect(state.leaderPairings['stormboyz-1']).toBeUndefined();
  });

  it('rejects two primary leaders on the same unit', () => {
    // Create a second primary leader
    const army = buildTestArmy();
    const secondPrimary = makeUnit({
      instanceId: 'char-primary-2',
      name: 'Big Mek',
      role: 'characters',
      isCharacter: true,
      modelCount: 1,
      leaderMapping: { canLead: ['Boyz'], isSecondaryLeader: false },
    });
    army.units.push(secondPrimary);
    resetStore(army);

    const { setLeaderPairing } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');
    setLeaderPairing('char-primary-2', 'boyz-1');

    const state = useArmyStore.getState();
    // Only the first should be attached
    expect(state.leaderPairings['boyz-1']).toEqual(['char-primary']);
  });

  it('allows primary + secondary on the same unit', () => {
    const { setLeaderPairing } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');
    setLeaderPairing('char-secondary', 'boyz-1');

    const state = useArmyStore.getState();
    expect(state.leaderPairings['boyz-1']).toEqual(['char-primary', 'char-secondary']);
  });

  it('unpairs character when set to null', () => {
    const { setLeaderPairing } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');
    setLeaderPairing('char-primary', null);

    const state = useArmyStore.getState();
    expect(state.leaderPairings['boyz-1']).toBeUndefined();
  });

  it('re-pairing character removes old pairing', () => {
    const { setLeaderPairing } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');
    setLeaderPairing('char-primary', 'boyz-2');

    const state = useArmyStore.getState();
    expect(state.leaderPairings['boyz-1']).toBeUndefined();
    expect(state.leaderPairings['boyz-2']).toEqual(['char-primary']);
  });

  it('getCharacterPairedUnit returns correct unit ID', () => {
    const { setLeaderPairing } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');

    expect(getCharacterPairedUnit('char-primary')).toBe('boyz-1');
    expect(getCharacterPairedUnit('char-secondary')).toBeNull();
  });

  it('getEligibleUnitsForLeader returns correct eligible units', () => {
    const army = useArmyStore.getState().armyList!;
    const character = army.units.find(u => u.instanceId === 'char-primary')!;

    const eligible = getEligibleUnitsForLeader(army, character);
    const eligibleIds = eligible.map(u => u.instanceId);

    expect(eligibleIds).toContain('boyz-1');
    expect(eligibleIds).toContain('boyz-2');
    expect(eligibleIds).not.toContain('stormboyz-1');
    expect(eligibleIds).not.toContain('char-primary');
  });
});

// === Transport Assignment Tests ===

describe('transport assignment', () => {
  it('assigns unit to transport', () => {
    const { assignToTransport } = useArmyStore.getState();
    assignToTransport('boyz-1', 'trukk-1');

    const state = useArmyStore.getState();
    expect(state.transportAllocations['trukk-1']).toEqual(['boyz-1']);
  });

  it('rejects excluded unit (Jump Pack)', () => {
    const { assignToTransport } = useArmyStore.getState();
    assignToTransport('stormboyz-1', 'trukk-1');

    const state = useArmyStore.getState();
    expect(state.transportAllocations['trukk-1']).toBeUndefined();
  });

  it('rejects assignment beyond capacity', () => {
    const { assignToTransport } = useArmyStore.getState();
    // boyz-1 has 10 models = 10 slots
    assignToTransport('boyz-1', 'trukk-1');
    // boyz-2 has 10 models = 10 more → total 20 > 12 capacity
    assignToTransport('boyz-2', 'trukk-1');

    const state = useArmyStore.getState();
    // Only boyz-1 should be embarked
    expect(state.transportAllocations['trukk-1']).toEqual(['boyz-1']);
  });

  it('reassigns unit between transports', () => {
    // Add a second transport
    const army = buildTestArmy();
    const trukk2 = makeUnit({
      instanceId: 'trukk-2',
      name: 'Trukk',
      displayName: 'Trukk #2',
      role: 'dedicated_transports',
      modelCount: 1,
      transportCapacity: {
        baseCapacity: 12,
        rawText: 'transport capacity of 12',
        multipliers: [],
        exclusions: ['Jump Pack'],
      },
    });
    army.units.push(trukk2);
    resetStore(army);

    const { assignToTransport } = useArmyStore.getState();
    assignToTransport('boyz-1', 'trukk-1');
    assignToTransport('boyz-1', 'trukk-2');

    const state = useArmyStore.getState();
    expect(state.transportAllocations['trukk-1']).toBeUndefined();
    expect(state.transportAllocations['trukk-2']).toEqual(['boyz-1']);
  });

  it('removes unit from transport', () => {
    const { assignToTransport, removeFromTransport } = useArmyStore.getState();
    assignToTransport('boyz-1', 'trukk-1');
    removeFromTransport('boyz-1');

    const state = useArmyStore.getState();
    expect(state.transportAllocations['trukk-1']).toBeUndefined();
  });

  it('capacity includes attached leaders', () => {
    const { setLeaderPairing, assignToTransport } = useArmyStore.getState();

    // Attach both leaders to boyz-1 (10 models + 1 primary + 1 secondary = 12 slots)
    setLeaderPairing('char-primary', 'boyz-1');
    setLeaderPairing('char-secondary', 'boyz-1');

    // Embark boyz-1 — should use 12 of 12 capacity
    assignToTransport('boyz-1', 'trukk-1');

    const state = useArmyStore.getState();
    expect(state.transportAllocations['trukk-1']).toEqual(['boyz-1']);

    // Capacity should be full (10 boys + 1 warboss + 1 painboy = 12)
    expect(getTransportUsedCapacity('trukk-1')).toBe(12);
  });

  it('getUnitTransport returns correct transport ID', () => {
    const { assignToTransport } = useArmyStore.getState();
    assignToTransport('boyz-1', 'trukk-1');

    expect(getUnitTransport('boyz-1')).toBe('trukk-1');
    expect(getUnitTransport('boyz-2')).toBeNull();
  });

  it('getTransportUsedCapacity returns correct count', () => {
    const { assignToTransport } = useArmyStore.getState();
    assignToTransport('boyz-1', 'trukk-1');

    expect(getTransportUsedCapacity('trukk-1')).toBe(10);
  });
});

// === Edge Cases ===

describe('edge cases', () => {
  it('reset clears all pairings and allocations', () => {
    const store = useArmyStore.getState();
    store.setLeaderPairing('char-primary', 'boyz-1');
    store.assignToTransport('boyz-1', 'trukk-1');

    useArmyStore.getState().reset();

    const state = useArmyStore.getState();
    expect(state.armyList).toBeNull();
    expect(state.leaderPairings).toEqual({});
    expect(state.transportAllocations).toEqual({});
  });

  it('actions with no army list loaded are no-ops', () => {
    useArmyStore.setState({ armyList: null });

    const { setLeaderPairing, assignToTransport, removeFromTransport } = useArmyStore.getState();
    setLeaderPairing('char-primary', 'boyz-1');
    assignToTransport('boyz-1', 'trukk-1');
    removeFromTransport('boyz-1');

    const state = useArmyStore.getState();
    expect(state.leaderPairings).toEqual({});
    expect(state.transportAllocations).toEqual({});
  });

  it('MAX_LEADERS_PER_UNIT constant is respected', () => {
    expect(MAX_LEADERS_PER_UNIT).toBe(2);

    const { setLeaderPairing } = useArmyStore.getState();

    // Attach primary + secondary (max allowed)
    setLeaderPairing('char-primary', 'boyz-1');
    setLeaderPairing('char-secondary', 'boyz-1');

    // Try to add a third leader — create one dynamically
    const army = buildTestArmy();
    const thirdLeader = makeUnit({
      instanceId: 'char-third',
      name: 'Weirdboy',
      role: 'characters',
      isCharacter: true,
      modelCount: 1,
      leaderMapping: { canLead: ['Boyz'], isSecondaryLeader: true },
    });
    army.units.push(thirdLeader);
    // Keep existing pairings but update army
    const currentPairings = useArmyStore.getState().leaderPairings;
    useArmyStore.setState({ armyList: army, leaderPairings: currentPairings });

    setLeaderPairing('char-third', 'boyz-1');

    const state = useArmyStore.getState();
    expect(state.leaderPairings['boyz-1']).toHaveLength(2);
    expect(state.leaderPairings['boyz-1']).toEqual(['char-primary', 'char-secondary']);
  });
});
