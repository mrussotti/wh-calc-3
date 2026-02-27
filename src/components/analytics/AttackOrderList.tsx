/** Drag-to-reorder attacking units list */

import { useCalcStore } from '../../state/calc-store.ts';
import { WeaponSelector } from './WeaponSelector.tsx';
import { ModifierControls, SourceModifierControls } from './ModifierControls.tsx';

export function AttackOrderList() {
  const configs = useCalcStore(s => s.attackerConfigs);
  const armyModifiers = useCalcStore(s => s.armyModifiers);
  const phaseMode = useCalcStore(s => s.phaseMode);
  const removeUnit = useCalcStore(s => s.removeAttackerUnit);
  const reorder = useCalcStore(s => s.reorderAttackerUnits);

  if (configs.length === 0) {
    return (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.85rem',
        fontStyle: 'italic',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        No attacking units selected. Add units from your army above.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {configs.map((config, idx) => (
        <div
          key={config.unitInstanceId}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
          }}
        >
          {/* Header row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <span style={{
              color: 'var(--text-dim)',
              fontSize: '0.75rem',
              fontWeight: 600,
              width: 20,
            }}>
              {idx + 1}.
            </span>
            <span style={{
              color: 'var(--text-bright)',
              fontSize: '0.9rem',
              fontWeight: 600,
              flex: 1,
            }}>
              {config.unitName}
            </span>

            {/* Move up/down buttons */}
            <button
              onClick={() => idx > 0 && reorder(idx, idx - 1)}
              disabled={idx === 0}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: idx === 0 ? 'var(--border)' : 'var(--text-dim)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                cursor: idx === 0 ? 'default' : 'pointer',
              }}
            >
              {'\u25B2'}
            </button>
            <button
              onClick={() => idx < configs.length - 1 && reorder(idx, idx + 1)}
              disabled={idx === configs.length - 1}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: idx === configs.length - 1 ? 'var(--border)' : 'var(--text-dim)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                cursor: idx === configs.length - 1 ? 'default' : 'pointer',
              }}
            >
              {'\u25BC'}
            </button>

            <button
              onClick={() => removeUnit(config.unitInstanceId)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--accent-red)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {'\u2715'}
            </button>
          </div>

          {config.sources.length > 1 ? (
            <>
              {/* Source-grouped weapons + per-source modifiers */}
              {config.sources.map(source => {
                const sourceWeapons = config.weapons.filter(w => w.source?.sourceId === source.sourceId);
                if (sourceWeapons.length === 0) return null;
                const sourceMods = config.sourceModifiers[source.sourceId] ?? [];
                return (
                  <div key={source.sourceId} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 8px',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-bright)' }}>
                        {source.sourceName}
                      </span>
                      {source.isLeader && (
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          color: 'var(--role-char)',
                          border: '1px solid var(--role-char)',
                          padding: '0 4px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          Leader
                        </span>
                      )}
                    </div>
                    <WeaponSelector
                      unitInstanceId={config.unitInstanceId}
                      weapons={sourceWeapons}
                      phaseMode={phaseMode}
                    />
                    <div style={{ marginTop: 6 }}>
                      <SourceModifierControls
                        unitInstanceId={config.unitInstanceId}
                        sourceId={source.sourceId}
                        modifiers={sourceMods}
                        inheritedModifiers={[...armyModifiers, ...config.modifiers]}
                        collapsible
                        defaultExpanded={sourceMods.length > 0}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Unit-level modifiers (all) */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>Unit Modifiers (all)</div>
                <ModifierControls
                  side="attacker"
                  level="unit"
                  targetId={config.unitInstanceId}
                  modifiers={config.modifiers}
                  inheritedModifiers={armyModifiers}
                  collapsible
                  defaultExpanded={config.modifiers.length > 0}
                />
              </div>
            </>
          ) : (
            <>
              {/* Flat rendering for solo units */}
              <WeaponSelector
                unitInstanceId={config.unitInstanceId}
                weapons={config.weapons}
                phaseMode={phaseMode}
              />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>Unit Modifiers</div>
                <ModifierControls
                  side="attacker"
                  level="unit"
                  targetId={config.unitInstanceId}
                  modifiers={config.modifiers}
                  inheritedModifiers={armyModifiers}
                  collapsible
                  defaultExpanded={config.modifiers.length > 0}
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
