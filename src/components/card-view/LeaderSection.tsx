import { useArmyStore, getCharacterPairedUnit } from '../../state/army-store.ts';
import type { EnrichedUnit } from '../../types/enriched.ts';

export function LeaderSection({ unit }: { unit: EnrichedUnit }) {
  const armyList = useArmyStore(s => s.armyList);
  const leaderPairings = useArmyStore(s => s.leaderPairings);
  const setLeaderPairing = useArmyStore(s => s.setLeaderPairing);

  if (!armyList) return null;

  // For characters with leader mapping: show "Leads" dropdown
  if (unit.isCharacter && unit.leaderMapping) {
    const pairedUnitId = getCharacterPairedUnit(unit.instanceId);

    // Find eligible units this character can lead
    const eligibleUnits = armyList.units.filter(u => {
      if (u.instanceId === unit.instanceId) return false;
      if (u.isCharacter && !u.transportCapacity) return false;
      return unit.leaderMapping!.canLead.some(
        name => name.toLowerCase() === u.name.toLowerCase()
      );
    });

    return (
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.82rem',
      }}>
        <span style={{ color: 'var(--text-dim)' }}>
          Leads:
          {unit.leaderMapping.isSecondaryLeader && (
            <span style={{ color: 'var(--role-char)', marginLeft: 4, fontSize: '0.7rem' }}>
              (Secondary)
            </span>
          )}
        </span>
        <select
          value={pairedUnitId ?? ''}
          onChange={e => setLeaderPairing(unit.instanceId, e.target.value || null)}
          style={{
            background: 'var(--bg-stat)',
            color: 'var(--text)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 6px',
            fontSize: '0.82rem',
            flex: 1,
          }}
        >
          <option value="">-- Unassigned --</option>
          {eligibleUnits.map(u => (
            <option key={u.instanceId} value={u.instanceId}>
              {u.displayName}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // For non-character units: show who leads them
  const leaders = leaderPairings[unit.instanceId] ?? [];
  if (leaders.length === 0) return null;

  return (
    <div style={{
      padding: '6px 12px',
      borderTop: '1px solid var(--border)',
      fontSize: '0.82rem',
      color: 'var(--text-dim)',
    }}>
      Led by:{' '}
      {leaders.map((leaderId, i) => {
        const leader = armyList.units.find(u => u.instanceId === leaderId);
        return (
          <span key={leaderId}>
            {i > 0 && ', '}
            <span style={{ color: 'var(--role-char)', fontWeight: 500 }}>
              {leader?.displayName ?? 'Unknown'}
            </span>
          </span>
        );
      })}
    </div>
  );
}
