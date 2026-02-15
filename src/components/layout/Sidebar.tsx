import { useArmyStore, getCharacterPairedUnit, useTransportUsedCapacity } from '../../state/army-store.ts';
import { CapacityBar } from '../shared/CapacityBar.tsx';
import type { UnitRole } from '../../types/army-list.ts';

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 8,
  fontWeight: 600,
};

export function Sidebar() {
  const armyList = useArmyStore(s => s.armyList);
  if (!armyList) return null;

  return (
    <div>
      {/* Army Rule */}
      {armyList.factionAbility && (
        <div style={sectionStyle}>
          <div style={sectionTitle}>Army Rule</div>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--accent-gold)',
            marginBottom: 4,
          }}>
            {armyList.factionAbility.name}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            lineHeight: 1.4,
            maxHeight: 120,
            overflow: 'auto',
          }}>
            {armyList.factionAbility.description}
          </div>
        </div>
      )}

      {/* Detachment Rule */}
      {armyList.detachment?.ability && (
        <div style={sectionStyle}>
          <div style={sectionTitle}>Detachment: {armyList.detachment.name}</div>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--accent-green-l)',
            marginBottom: 4,
          }}>
            {armyList.detachment.ability.name}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            lineHeight: 1.4,
            maxHeight: 120,
            overflow: 'auto',
          }}>
            {armyList.detachment.ability.description}
          </div>
        </div>
      )}

      {/* Stratagems Summary */}
      {armyList.detachment && armyList.detachment.stratagems.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitle}>Stratagems ({armyList.detachment.stratagems.length})</div>
          {armyList.detachment.stratagems.map((s, i) => (
            <div key={i} style={{
              padding: '4px 0',
              borderBottom: i < armyList.detachment!.stratagems.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-bright)', fontWeight: 500 }}>
                  {s.name}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>
                  {s.cpCost}CP
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {s.type} | {s.phase}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Character Pairings */}
      <CharacterPairingsPanel />

      {/* Transport Allocations */}
      <TransportAllocationPanel />

      {/* Points Summary */}
      <PointsSummaryPanel />
    </div>
  );
}

function CharacterPairingsPanel() {
  const armyList = useArmyStore(s => s.armyList);
  if (!armyList) return null;

  const characters = armyList.units.filter(u => u.isCharacter && u.leaderMapping);
  if (characters.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>Character Pairings</div>
      {characters.map(char => {
        const pairedUnitId = getCharacterPairedUnit(char.instanceId);
        const pairedUnit = pairedUnitId
          ? armyList.units.find(u => u.instanceId === pairedUnitId)
          : null;

        return (
          <div key={char.instanceId} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '3px 0',
            fontSize: '0.78rem',
          }}>
            <span style={{ color: 'var(--role-char)' }}>{char.displayName}</span>
            <span style={{ color: pairedUnit ? 'var(--text)' : 'var(--text-dim)' }}>
              {pairedUnit ? pairedUnit.displayName : 'Unassigned'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TransportAllocationPanel() {
  const armyList = useArmyStore(s => s.armyList);
  if (!armyList) return null;

  const transports = armyList.units.filter(u => u.transportCapacity);
  if (transports.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>Transport Allocations</div>
      {transports.map(t => (
        <TransportItem key={t.instanceId} transport={t} />
      ))}
    </div>
  );
}

function TransportItem({ transport }: { transport: import('../../types/enriched.ts').EnrichedUnit }) {
  const armyList = useArmyStore(s => s.armyList);
  const transportAllocations = useArmyStore(s => s.transportAllocations);
  const used = useTransportUsedCapacity(transport.instanceId);
  const embarkedIds = transportAllocations[transport.instanceId] ?? [];

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: '0.82rem',
        color: 'var(--text-bright)',
        marginBottom: 3,
      }}>
        {transport.displayName}
      </div>
      <CapacityBar used={used} total={transport.transportCapacity!.baseCapacity} />
      {embarkedIds.length > 0 && armyList && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
          {embarkedIds.map(uid => {
            const u = armyList.units.find(x => x.instanceId === uid);
            return u?.displayName ?? '?';
          }).join(', ')}
        </div>
      )}
    </div>
  );
}

function PointsSummaryPanel() {
  const armyList = useArmyStore(s => s.armyList);
  if (!armyList) return null;

  const byRole: Record<UnitRole, number> = {
    characters: 0,
    battleline: 0,
    dedicated_transports: 0,
    other: 0,
  };
  for (const u of armyList.units) {
    byRole[u.role] += u.points;
  }

  const labels: Record<UnitRole, string> = {
    characters: 'Characters',
    battleline: 'Battleline',
    dedicated_transports: 'Transports',
    other: 'Other',
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>Points Breakdown</div>
      {(Object.entries(byRole) as [UnitRole, number][])
        .filter(([, pts]) => pts > 0)
        .map(([role, pts]) => (
          <div key={role} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '2px 0',
            fontSize: '0.82rem',
          }}>
            <span style={{ color: 'var(--text-dim)' }}>{labels[role]}</span>
            <span style={{ color: 'var(--text-bright)', fontWeight: 500 }}>{pts}</span>
          </div>
        ))}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0 0',
        borderTop: '1px solid var(--border)',
        marginTop: 4,
        fontWeight: 600,
      }}>
        <span style={{ color: 'var(--text)' }}>Total</span>
        <span style={{ color: 'var(--accent-gold)' }}>{armyList.totalPoints}</span>
      </div>
    </div>
  );
}
