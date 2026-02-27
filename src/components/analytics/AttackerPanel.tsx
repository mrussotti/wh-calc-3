/** Attacker panel — unit selection, weapon toggles, modifiers */

import { useState } from 'react';
import { useArmyStore } from '../../state/army-store.ts';
import { useCalcStore } from '../../state/calc-store.ts';
import { PhaseToggle } from './PhaseToggle.tsx';
import { ModifierControls } from './ModifierControls.tsx';
import { AttackOrderList } from './AttackOrderList.tsx';

export function AttackerPanel() {
  const armyList = useArmyStore(s => s.armyList);
  const leaderPairings = useArmyStore(s => s.leaderPairings);
  const phaseMode = useCalcStore(s => s.phaseMode);
  const setPhaseMode = useCalcStore(s => s.setPhaseMode);
  const armyModifiers = useCalcStore(s => s.armyModifiers);
  const addAttackerUnit = useCalcStore(s => s.addAttackerUnit);
  const attackerConfigs = useCalcStore(s => s.attackerConfigs);
  const context = useCalcStore(s => s.context);
  const setContext = useCalcStore(s => s.setContext);
  const [showDropdown, setShowDropdown] = useState(false);

  if (!armyList) return null;

  // Build set of character IDs that are paired as leaders
  const pairedCharacterIds = new Set(
    Object.values(leaderPairings).flat(),
  );

  // Available units = those not already added, have weapons, and aren't paired characters
  // (paired characters get merged into their bodyguard unit automatically)
  const addedIds = new Set(attackerConfigs.map(c => c.unitInstanceId));
  const availableUnits = armyList.units.filter(u =>
    !addedIds.has(u.instanceId) &&
    u.weapons.length > 0 &&
    !pairedCharacterIds.has(u.instanceId)
  );

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 16,
    }}>
      <h3 style={{
        fontFamily: 'var(--font-head)',
        fontSize: '1.1rem',
        color: 'var(--text-bright)',
        marginBottom: 12,
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        Attackers
      </h3>

      {/* Phase toggle */}
      <div style={{ marginBottom: 12 }}>
        <PhaseToggle mode={phaseMode} onChange={setPhaseMode} />
      </div>

      {/* Context toggles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <ContextToggle label="Half Range" active={context.halfRange} onChange={v => setContext({ halfRange: v })} />
        <ContextToggle label="Charging" active={context.isCharging} onChange={v => setContext({ isCharging: v })} />
        <ContextToggle label="Stationary" active={context.didNotMove} onChange={v => setContext({ didNotMove: v })} />
        <ContextToggle label="Overwatch" active={context.isOverwatch} onChange={v => setContext({ isOverwatch: v })} />
      </div>

      {/* Army modifiers */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 4, fontWeight: 600 }}>Army Modifiers</div>
        <ModifierControls
          side="attacker"
          level="army"
          targetId=""
          modifiers={armyModifiers}
          collapsible
          defaultExpanded
        />
      </div>

      {/* Add unit dropdown */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          + Add Unit from Army {'\u25BE'}
        </button>
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            maxHeight: 200,
            overflow: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {availableUnits.length === 0 ? (
              <div style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                All units already added
              </div>
            ) : (
              availableUnits.map(unit => {
                const leaders = (leaderPairings[unit.instanceId] ?? [])
                  .map(id => armyList.units.find(u => u.instanceId === id))
                  .filter(Boolean);
                const label = leaders.length > 0
                  ? `${unit.displayName} (${unit.modelCount}) + ${leaders.map(l => l!.displayName).join(', ')}`
                  : `${unit.displayName} (${unit.modelCount})`;
                return (
                  <button
                    key={unit.instanceId}
                    onClick={() => {
                      addAttackerUnit(unit.instanceId);
                      setShowDropdown(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text)',
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-head)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {label}
                  </button>
                );
              }))
            }
          </div>
        )}
      </div>

      {/* Attack order list */}
      <AttackOrderList />
    </div>
  );
}

function ContextToggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        background: active ? 'rgba(74, 144, 217, 0.15)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
        color: active ? 'var(--accent-blue-l)' : 'var(--text-dim)',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        cursor: 'pointer',
      }}
    >
      {active ? '\u25A3 ' : ''}{label}
    </button>
  );
}
