import { useArmyStore, useTransportUsedCapacity, useUnitTransport } from '../../state/army-store.ts';
import { CapacityBar } from '../shared/CapacityBar.tsx';
import type { EnrichedUnit } from '../../types/enriched.ts';

export function TransportSection({ unit }: { unit: EnrichedUnit }) {
  const armyList = useArmyStore(s => s.armyList);
  const transportAllocations = useArmyStore(s => s.transportAllocations);
  const assignToTransport = useArmyStore(s => s.assignToTransport);
  const removeFromTransport = useArmyStore(s => s.removeFromTransport);
  const usedCapacity = useTransportUsedCapacity(unit.instanceId);
  const currentTransportId = useUnitTransport(unit.instanceId);

  if (!armyList) return null;

  // For transport units: show capacity bar and embarked units
  if (unit.transportCapacity) {
    const embarkedUnitIds = transportAllocations[unit.instanceId] ?? [];

    return (
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Transport Capacity
        </div>
        <CapacityBar used={usedCapacity} total={unit.transportCapacity!.baseCapacity} />
        {embarkedUnitIds.length > 0 && (
          <div style={{ marginTop: 4, fontSize: '0.78rem' }}>
            {embarkedUnitIds.map(uid => {
              const u = armyList.units.find(x => x.instanceId === uid);
              return (
                <div key={uid} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  color: 'var(--text-dim)',
                }}>
                  <span>{u?.displayName ?? 'Unknown'} ({u?.modelCount ?? 0})</span>
                  <button
                    onClick={() => removeFromTransport(uid)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-red)',
                      fontSize: '0.75rem',
                      padding: '0 4px',
                    }}
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // For non-transport units: show transport assignment
  if (unit.isCharacter) return null; // Characters embark with their unit

  const transports = armyList.units.filter(u => u.transportCapacity);

  return (
    <div style={{
      padding: '6px 12px',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: '0.82rem',
    }}>
      <span style={{ color: 'var(--text-dim)' }}>Transport:</span>
      <select
        value={currentTransportId ?? ''}
        onChange={e => {
          if (e.target.value) {
            assignToTransport(unit.instanceId, e.target.value);
          } else {
            removeFromTransport(unit.instanceId);
          }
        }}
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
        <option value="">-- None --</option>
        {transports.map(t => (
          <option key={t.instanceId} value={t.instanceId}>
            {t.displayName} ({t.transportCapacity!.baseCapacity} cap)
          </option>
        ))}
      </select>
    </div>
  );
}
