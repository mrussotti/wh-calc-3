import { useArmyStore, useCharacterPairedUnit, useUnitTransport, useTransportUsedCapacity, getEligibleUnitsForLeader } from '../../state/army-store.ts';
import { RoleBadge } from '../shared/RoleBadge.tsx';
import { CapacityBar } from '../shared/CapacityBar.tsx';
import { ROLE_ORDER, ROLE_TITLES } from '../../constants.ts';
import type { UnitRole } from '../../types/army-list.ts';
import type { EnrichedUnit } from '../../types/enriched.ts';

export function TableView() {
  const armyList = useArmyStore(s => s.armyList);
  const expandedUnits = useArmyStore(s => s.expandedUnits);
  const toggleUnitExpanded = useArmyStore(s => s.toggleUnitExpanded);
  const expandAll = useArmyStore(s => s.expandAll);
  const collapseAll = useArmyStore(s => s.collapseAll);

  if (!armyList) return null;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 10,
        alignItems: 'center',
      }}>
        <ToolbarButton onClick={expandAll}>Expand All</ToolbarButton>
        <ToolbarButton onClick={collapseAll}>Collapse All</ToolbarButton>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {armyList.units.length} units | {armyList.totalPoints} pts
        </span>
      </div>

      {/* Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem',
      }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <th style={thStyle}></th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Unit</th>
            <th style={thStyle}>M</th>
            <th style={thStyle}>T</th>
            <th style={thStyle}>Sv</th>
            <th style={thStyle}>W</th>
            <th style={thStyle}>Ld</th>
            <th style={thStyle}>OC</th>
            <th style={thStyle}>Models</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Pts</th>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {ROLE_ORDER.map(role => {
            const units = armyList.units.filter(u => u.role === role);
            if (units.length === 0) return null;
            return (
              <SectionGroup
                key={role}
                role={role}
                units={units}
                expandedUnits={expandedUnits}
                toggleExpanded={toggleUnitExpanded}
              />
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--accent-green)', fontWeight: 600 }}>
            <td colSpan={9} style={{ padding: '6px 8px', color: 'var(--text-bright)' }}>
              Total
            </td>
            <td style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--accent-gold)' }}>
              {armyList.totalPoints}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '4px 8px',
  color: 'var(--text-dim)',
  fontWeight: 500,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
};

function ToolbarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
      padding: '4px 10px',
      borderRadius: 3,
      fontSize: '0.78rem',
    }}>
      {children}
    </button>
  );
}

function SectionGroup({ role, units, expandedUnits, toggleExpanded }: {
  role: UnitRole;
  units: EnrichedUnit[];
  expandedUnits: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={11} style={{
          padding: '8px 8px 4px',
          fontFamily: 'var(--font-head)',
          fontSize: '0.9rem',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: '1px solid var(--border)',
        }}>
          {ROLE_TITLES[role]} ({units.length})
        </td>
      </tr>
      {units.map(unit => (
        <UnitRow
          key={unit.instanceId}
          unit={unit}
          isExpanded={expandedUnits.has(unit.instanceId)}
          onToggle={() => toggleExpanded(unit.instanceId)}
        />
      ))}
    </>
  );
}

function UnitRow({ unit, isExpanded, onToggle }: {
  unit: EnrichedUnit;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const primaryStats = unit.modelStats[0];
  const pairedUnitId = useCharacterPairedUnit(unit.instanceId);
  const transportId = useUnitTransport(unit.instanceId);
  const armyList = useArmyStore(s => s.armyList);
  const transportUsed = useTransportUsedCapacity(unit.instanceId);

  let statusText = '';
  if (unit.isCharacter && pairedUnitId && armyList) {
    const paired = armyList.units.find(u => u.instanceId === pairedUnitId);
    statusText = `Leads ${paired?.displayName ?? '?'}`;
  }
  if (transportId && armyList) {
    const transport = armyList.units.find(u => u.instanceId === transportId);
    statusText = statusText
      ? `${statusText} | In ${transport?.displayName ?? '?'}`
      : `In ${transport?.displayName ?? '?'}`;
  }
  if (unit.transportCapacity) {
    statusText = `${transportUsed}/${unit.transportCapacity.baseCapacity}`;
  }

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          background: isExpanded ? 'var(--bg-card)' : 'transparent',
        }}
      >
        <td style={{ padding: '4px 8px', width: 24, textAlign: 'center', color: 'var(--text-dim)' }}>
          {isExpanded ? '\u25BC' : '\u25B6'}
        </td>
        <td style={{ padding: '4px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-bright)', fontWeight: 500 }}>
              {unit.displayName}
            </span>
            {unit.isWarlord && <span style={{ fontSize: '0.8rem' }}>&#9813;</span>}
            <RoleBadge role={unit.role} />
            {unit.enhancement && (
              <span style={{ fontSize: '0.72rem', color: 'var(--role-char)' }}>
                {unit.enhancement.name}
              </span>
            )}
          </div>
        </td>
        <td style={cellCenter}>{primaryStats?.M ?? '-'}</td>
        <td style={cellCenter}>{primaryStats?.T ?? '-'}</td>
        <td style={cellCenter}>{primaryStats?.Sv ?? '-'}</td>
        <td style={cellCenter}>{primaryStats?.W ?? '-'}</td>
        <td style={cellCenter}>{primaryStats?.Ld ?? '-'}</td>
        <td style={cellCenter}>{primaryStats?.OC ?? '-'}</td>
        <td style={cellCenter}>{unit.modelCount}</td>
        <td style={{ ...cellCenter, textAlign: 'right', color: 'var(--accent-gold)' }}>
          {unit.points}
        </td>
        <td style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {statusText}
          {unit.transportCapacity && (
            <div style={{ marginTop: 2, maxWidth: 100 }}>
              <CapacityBar
                used={transportUsed}
                total={unit.transportCapacity.baseCapacity}
              />
            </div>
          )}
        </td>
      </tr>
      {isExpanded && <ExpandedRow unit={unit} />}
    </>
  );
}

const cellCenter: React.CSSProperties = { textAlign: 'center', padding: '4px 8px' };

function ExpandedRow({ unit }: { unit: EnrichedUnit }) {
  return (
    <tr style={{ background: 'var(--bg-card)' }}>
      <td></td>
      <td colSpan={10} style={{ padding: '8px 12px' }}>
        {/* Model stats (shown when unit has multiple model profiles) */}
        {unit.modelStats.length > 1 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}>Models</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  {['Model', 'M', 'T', 'Sv', 'W', 'Ld', 'OC', 'Inv'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Model' ? 'left' : 'center',
                      padding: '2px 6px',
                      color: 'var(--text-dim)',
                      fontWeight: 500,
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unit.modelStats.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '2px 6px', color: 'var(--text-bright)', fontWeight: 500 }}>{s.name}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{s.M}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{s.T}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{s.Sv}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{s.W}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{s.Ld}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{s.OC}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px', color: s.invSv !== '-' ? 'var(--accent-gold)' : undefined }}>{s.invSv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Weapons */}
        {unit.weapons.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}>Weapons</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  {['Weapon', 'Range', 'A', 'BS/WS', 'S', 'AP', 'D'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Weapon' ? 'left' : 'center',
                      padding: '2px 6px',
                      color: 'var(--text-dim)',
                      fontWeight: 500,
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unit.weapons.map((w, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '2px 6px', color: 'var(--text-bright)' }}>
                      {w.count > 1 ? `${w.count}x ` : ''}
                      {w.profileName ? `${w.name} - ${w.profileName}` : w.name}
                      {w.keywords && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: 4 }}>
                          [{w.keywords}]
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{w.range}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{w.A}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{w.BS_WS}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{w.S}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{w.AP}</td>
                    <td style={{ textAlign: 'center', padding: '2px 6px' }}>{w.D}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Abilities */}
        {unit.abilities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {unit.abilities.map((ab, i) => (
              <span key={i} title={ab.description} style={{
                padding: '1px 6px',
                borderRadius: 3,
                fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-dim)',
                border: '1px solid var(--border)',
                cursor: ab.description ? 'help' : 'default',
              }}>
                {ab.name}
              </span>
            ))}
          </div>
        )}

        {/* Keywords */}
        {unit.keywords.length > 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 6 }}>
            Keywords: {unit.keywords.join(', ')}
          </div>
        )}

        {/* Equipment */}
        {unit.equipment.length > 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6 }}>
            Equipment: {unit.equipment.join(', ')}
          </div>
        )}

        {/* Warnings */}
        {unit.matchWarnings.length > 0 && (
          <div style={{
            padding: '4px 0 2px',
            fontSize: '0.72rem',
            color: 'var(--accent-red)',
            opacity: 0.8,
          }}>
            {unit.matchWarnings.map((w, i) => <div key={i}>{w}</div>)}
          </div>
        )}

        {/* Leader pairing + Transport assignment */}
        <ExpandedRowControls unit={unit} />
      </td>
    </tr>
  );
}

function ExpandedRowControls({ unit }: { unit: EnrichedUnit }) {
  const armyList = useArmyStore(s => s.armyList);
  const leaderPairings = useArmyStore(s => s.leaderPairings);
  const transportAllocations = useArmyStore(s => s.transportAllocations);
  const setLeaderPairing = useArmyStore(s => s.setLeaderPairing);
  const assignToTransport = useArmyStore(s => s.assignToTransport);
  const removeFromTransport = useArmyStore(s => s.removeFromTransport);
  const transportUsed = useTransportUsedCapacity(unit.instanceId);
  const pairedUnitId = useCharacterPairedUnit(unit.instanceId);
  const currentTransportId = useUnitTransport(unit.instanceId);

  if (!armyList) return null;

  const eligibleUnits = unit.isCharacter && unit.leaderMapping
    ? getEligibleUnitsForLeader(armyList, unit)
    : [];

  const dropdownStyle: React.CSSProperties = {
    background: 'var(--bg-stat)',
    color: 'var(--text)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px 6px',
    fontSize: '0.8rem',
    minWidth: 180,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--text-dim)',
    marginRight: 6,
    whiteSpace: 'nowrap',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  };

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
      {/* Character: show "Leads" dropdown */}
      {unit.isCharacter && unit.leaderMapping && (
        <div style={rowStyle}>
          <span style={labelStyle}>
            Leads:
            {unit.leaderMapping.isSecondaryLeader && (
              <span style={{ color: 'var(--role-char)', marginLeft: 4, fontSize: '0.7rem' }}>(Secondary)</span>
            )}
          </span>
          <select
            value={pairedUnitId ?? ''}
            onChange={e => { e.stopPropagation(); setLeaderPairing(unit.instanceId, e.target.value || null); }}
            onClick={e => e.stopPropagation()}
            style={dropdownStyle}
          >
            <option value="">-- Unassigned --</option>
            {eligibleUnits.map(u => (
              <option key={u.instanceId} value={u.instanceId}>{u.displayName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Non-character unit: show who leads it */}
      {!unit.isCharacter && (leaderPairings[unit.instanceId]?.length ?? 0) > 0 && (
        <div style={{ ...rowStyle, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          Led by:{' '}
          {(leaderPairings[unit.instanceId] ?? []).map((leaderId, i) => {
            const leader = armyList.units.find(u => u.instanceId === leaderId);
            return (
              <span key={leaderId}>
                {i > 0 && ', '}
                <span style={{ color: 'var(--role-char)', fontWeight: 500 }}>{leader?.displayName ?? '?'}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Transport: show capacity bar + cargo for transports */}
      {unit.transportCapacity && (() => {
        const embarkedIds = transportAllocations[unit.instanceId] ?? [];
        return (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={labelStyle}>Capacity:</span>
              <div style={{ width: 120 }}>
                <CapacityBar used={transportUsed} total={unit.transportCapacity!.baseCapacity} />
              </div>
            </div>
            {embarkedIds.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Embarked:{' '}
                {embarkedIds.map((uid, i) => {
                  const u = armyList.units.find(x => x.instanceId === uid);
                  return (
                    <span key={uid}>
                      {i > 0 && ', '}
                      {u?.displayName ?? '?'}
                      <button
                        onClick={e => { e.stopPropagation(); removeFromTransport(uid); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: '0.72rem', padding: '0 3px', cursor: 'pointer' }}
                      >x</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Non-transport, non-character unit: show transport assignment */}
      {!unit.transportCapacity && !unit.isCharacter && (() => {
        const transports = armyList.units.filter(u => u.transportCapacity);
        if (transports.length === 0) return null;
        return (
          <div style={rowStyle}>
            <span style={labelStyle}>Transport:</span>
            <select
              value={currentTransportId ?? ''}
              onChange={e => {
                e.stopPropagation();
                if (e.target.value) {
                  assignToTransport(unit.instanceId, e.target.value);
                } else {
                  removeFromTransport(unit.instanceId);
                }
              }}
              onClick={e => e.stopPropagation()}
              style={dropdownStyle}
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
      })()}
    </div>
  );
}
