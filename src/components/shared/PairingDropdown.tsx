import { useArmyStore } from '../../state/army-store.ts';
import type { EnrichedUnit } from '../../types/enriched.ts';

interface Props {
  character: EnrichedUnit;
  availableUnits: EnrichedUnit[];
  currentPairedUnitId: string | null;
}

export function PairingDropdown({ character, availableUnits, currentPairedUnitId }: Props) {
  const setLeaderPairing = useArmyStore(s => s.setLeaderPairing);

  return (
    <select
      value={currentPairedUnitId ?? ''}
      onChange={e => setLeaderPairing(character.instanceId, e.target.value || null)}
      style={{
        background: 'var(--bg-stat)',
        color: 'var(--text)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 6px',
        fontSize: '0.82rem',
      }}
    >
      <option value="">-- Unassigned --</option>
      {availableUnits.map(u => (
        <option key={u.instanceId} value={u.instanceId}>
          {u.displayName}
        </option>
      ))}
    </select>
  );
}
