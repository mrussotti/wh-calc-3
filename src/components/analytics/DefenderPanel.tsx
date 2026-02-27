/** Defender panel — Wahapedia browser or custom statline */

import { useState } from 'react';
import { useCalcStore } from '../../state/calc-store.ts';
import { getLoadedData } from '../../data/index.ts';
import { UnitBrowser } from './UnitBrowser.tsx';
import { CustomStatline } from './CustomStatline.tsx';
import { ModifierControls } from './ModifierControls.tsx';

type DefenderTab = 'wahapedia' | 'custom';

export function DefenderPanel() {
  const [tab, setTab] = useState<DefenderTab>('wahapedia');
  const defenderProfile = useCalcStore(s => s.defenderProfile);
  const defender = useCalcStore(s => s.defender);
  const defenderStatOverrides = useCalcStore(s => s.defenderStatOverrides);
  const setDefenderStatOverride = useCalcStore(s => s.setDefenderStatOverride);
  const clearDefenderStatOverrides = useCalcStore(s => s.clearDefenderStatOverrides);
  const defenderLeaderProfiles = useCalcStore(s => s.defenderLeaderProfiles);
  const removeDefenderLeader = useCalcStore(s => s.removeDefenderLeader);

  const isWahapedia = defender?.type === 'wahapedia';
  const hasOverrides = defenderStatOverrides && Object.values(defenderStatOverrides).some(v => v !== undefined);

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
        Target
      </h3>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <TabButton label="Wahapedia" active={tab === 'wahapedia'} onClick={() => setTab('wahapedia')} />
        <TabButton label="Custom" active={tab === 'custom'} onClick={() => setTab('custom')} />
      </div>

      {/* Tab content */}
      {tab === 'wahapedia' ? <UnitBrowser /> : <CustomStatline />}

      {/* Selected defender display */}
      {defenderProfile && (
        <div style={{
          marginTop: 12,
          padding: 10,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-bright)',
              flex: 1,
            }}>
              {defenderProfile.name}
            </span>
            {isWahapedia && hasOverrides && (
              <button
                onClick={clearDefenderStatOverrides}
                title="Reset all stat overrides"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--accent-orange)',
                  color: 'var(--accent-orange)',
                  fontSize: '0.6rem',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                Reset Stats
              </button>
            )}
          </div>

          {/* Stat bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <EditableStatChip
              label="T"
              baseValue={defenderProfile.toughness}
              overrideValue={defenderStatOverrides?.toughness}
              format={v => String(v)}
              parse={v => { const n = parseInt(v); return isNaN(n) ? undefined : n; }}
              editable={isWahapedia}
              onOverride={v => setDefenderStatOverride('toughness', v)}
            />
            <EditableStatChip
              label="Sv"
              baseValue={defenderProfile.save}
              overrideValue={defenderStatOverrides?.save}
              format={v => `${v}+`}
              parse={v => { const n = parseInt(v); return isNaN(n) ? undefined : n; }}
              editable={isWahapedia}
              onOverride={v => setDefenderStatOverride('save', v)}
            />
            <EditableStatChip
              label="Inv"
              baseValue={defenderProfile.invulnerableSave}
              overrideValue={defenderStatOverrides?.invulnerableSave}
              format={v => v != null ? `${v}+` : '\u2014'}
              parse={v => { if (v === '' || v === '-') return null; const n = parseInt(v); return isNaN(n) ? undefined : n; }}
              editable={isWahapedia}
              onOverride={v => setDefenderStatOverride('invulnerableSave', v)}
            />
            <EditableStatChip
              label="W"
              baseValue={defenderProfile.wounds}
              overrideValue={defenderStatOverrides?.wounds}
              format={v => String(v)}
              parse={v => { const n = parseInt(v); return isNaN(n) ? undefined : n; }}
              editable={isWahapedia}
              onOverride={v => setDefenderStatOverride('wounds', v)}
            />
            <EditableStatChip
              label="Models"
              baseValue={defenderProfile.modelCount}
              overrideValue={defenderStatOverrides?.modelCount}
              format={v => String(v)}
              parse={v => { const n = parseInt(v); return isNaN(n) ? undefined : n; }}
              editable={isWahapedia}
              onOverride={v => setDefenderStatOverride('modelCount', v)}
            />
            <EditableStatChip
              label="FNP"
              baseValue={defenderProfile.feelNoPain}
              overrideValue={defenderStatOverrides?.feelNoPain}
              format={v => v != null ? `${v}+` : '\u2014'}
              parse={v => { if (v === '' || v === '-') return null; const n = parseInt(v); return isNaN(n) ? undefined : n; }}
              editable={isWahapedia}
              onOverride={v => setDefenderStatOverride('feelNoPain', v)}
            />
          </div>

          {/* Keywords */}
          {defenderProfile.keywords.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 8 }}>
              {defenderProfile.keywords.join(', ')}
            </div>
          )}

          {/* Defender modifiers */}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4, fontWeight: 600 }}>
            Defensive Modifiers
          </div>
          <ModifierControls
            side="defender"
            level="army"
            targetId=""
            modifiers={defenderProfile.modifiers}
            collapsible
            defaultExpanded
          />
        </div>
      )}

      {/* Attached Leaders */}
      {defenderProfile && (
        <AttachedLeadersSection
          leaders={defenderLeaderProfiles}
          onRemove={removeDefenderLeader}
        />
      )}
    </div>
  );
}

function AttachedLeadersSection({ leaders, onRemove }: {
  leaders: import('../../calc/types.ts').DefenderProfile[];
  onRemove: (index: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<'wahapedia' | 'custom'>('wahapedia');

  return (
    <div style={{
      marginTop: 12,
      padding: 10,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
    }}>
      <div style={{
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        marginBottom: 6,
        fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        Attached Leaders ({leaders.length}/2)
      </div>

      {leaders.map((leader, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-bright)', flex: 1, fontWeight: 600 }}>
            {leader.name}
          </span>
          <StatMini label="T" value={String(leader.toughness)} />
          <StatMini label="Sv" value={`${leader.save}+`} />
          <StatMini label="W" value={String(leader.wounds)} />
          {leader.invulnerableSave && <StatMini label="Inv" value={`${leader.invulnerableSave}+`} />}
          <button
            onClick={() => onRemove(i)}
            style={{
              background: 'transparent',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
              fontSize: '0.65rem',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Remove
          </button>
        </div>
      ))}

      {leaders.length < 2 && !adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 6,
            background: 'transparent',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          + Add Leader
        </button>
      )}

      {adding && leaders.length < 2 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <TabButton label="Wahapedia" active={addMode === 'wahapedia'} onClick={() => setAddMode('wahapedia')} />
            <TabButton label="Custom" active={addMode === 'custom'} onClick={() => setAddMode('custom')} />
            <button
              onClick={() => setAdding(false)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          {addMode === 'wahapedia'
            ? <LeaderBrowser onAdded={() => setAdding(false)} />
            : <CustomLeaderForm onAdded={() => setAdding(false)} />
          }
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
      {label}:{' '}
      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
    </span>
  );
}

function LeaderBrowser({ onAdded }: { onAdded: () => void }) {
  const addDefenderLeaderFromWahapedia = useCalcStore(s => s.addDefenderLeaderFromWahapedia);
  const [search, setSearch] = useState('');

  let data: ReturnType<typeof getLoadedData> | null = null;
  try {
    data = getLoadedData();
  } catch {
    return <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Wahapedia data not loaded</div>;
  }

  const filteredDatasheets = (() => {
    if (!data || search.length < 2) return [];
    const lower = search.toLowerCase();
    return (Object.values(data.datasheets) as { id: string; name: string; faction_id: string }[])
      .filter(ds => ds.name.toLowerCase().includes(lower))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name..."
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
        }}
      />
      {search.length >= 2 && (
        <div style={{
          maxHeight: 150,
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          {filteredDatasheets.length === 0 ? (
            <div style={{ padding: '6px 10px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
              No matches
            </div>
          ) : (
            filteredDatasheets.map(ds => (
              <button
                key={ds.id}
                onClick={() => {
                  addDefenderLeaderFromWahapedia(ds.id, ds.faction_id);
                  setSearch('');
                  onAdded();
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-head)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{ds.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: 8 }}>
                  {data!.factions[ds.faction_id]?.name ?? ds.faction_id}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CustomLeaderForm({ onAdded }: { onAdded: () => void }) {
  const addDefenderLeaderCustom = useCalcStore(s => s.addDefenderLeaderCustom);
  const [name, setName] = useState('Leader');
  const [t, setT] = useState('5');
  const [sv, setSv] = useState('3');
  const [inv, setInv] = useState('');
  const [w, setW] = useState('4');
  const [fnp, setFnp] = useState('');

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '4px 6px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    width: 48,
    textAlign: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
        style={{ ...inputStyle, width: '100%', textAlign: 'left' }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          T <input value={t} onChange={e => setT(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Sv <input value={sv} onChange={e => setSv(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Inv <input value={inv} onChange={e => setInv(e.target.value)} placeholder="-" style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          W <input value={w} onChange={e => setW(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          FNP <input value={fnp} onChange={e => setFnp(e.target.value)} placeholder="-" style={inputStyle} />
        </label>
      </div>
      <button
        onClick={() => {
          const tVal = parseInt(t);
          const svVal = parseInt(sv);
          const invVal = inv ? parseInt(inv) : null;
          const wVal = parseInt(w);
          const fnpVal = fnp ? parseInt(fnp) : null;
          if (isNaN(tVal) || isNaN(svVal) || isNaN(wVal)) return;
          addDefenderLeaderCustom(name || 'Leader', tVal, svVal, invVal, wVal, fnpVal);
          onAdded();
        }}
        style={{
          background: 'var(--accent-green-d)',
          border: '1px solid var(--accent-green)',
          color: 'var(--accent-green-l)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          cursor: 'pointer',
        }}
      >
        Add Leader
      </button>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent-green-d)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-green)' : 'var(--border)'}`,
        color: active ? 'var(--accent-green-l)' : 'var(--text-dim)',
        padding: '4px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {active ? '\u25C9 ' : '\u25CB '}{label}
    </button>
  );
}

/** Editable stat chip — click to toggle input mode when editable */
function EditableStatChip<T extends number | null>({ label, baseValue, overrideValue, format, parse, editable, onOverride }: {
  label: string;
  baseValue: T;
  overrideValue?: T;
  format: (v: T) => string;
  parse: (v: string) => T | undefined;
  editable?: boolean;
  onOverride: (v: T | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isOverridden = overrideValue !== undefined;
  const displayValue = isOverridden ? overrideValue : baseValue;

  if (editing && editable) {
    const rawValue = isOverridden
      ? (overrideValue == null ? '' : String(overrideValue))
      : (baseValue == null ? '' : String(baseValue));
    return (
      <div style={{
        background: 'var(--bg-stat)',
        border: '1px solid var(--accent-orange)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 4px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{label}</div>
        <input
          type="text"
          autoFocus
          defaultValue={rawValue}
          onBlur={(e) => {
            const val = e.target.value.trim();
            const parsed = parse(val);
            if (parsed === undefined) {
              // Invalid input — clear override
              onOverride(undefined);
            } else {
              // Check if same as base
              if (parsed === baseValue) {
                onOverride(undefined);
              } else {
                onOverride(parsed as T | undefined);
              }
            }
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            width: 32,
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-orange)',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center',
            outline: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={editable ? () => setEditing(true) : undefined}
      style={{
        background: 'var(--bg-stat)',
        border: `1px solid ${isOverridden ? 'var(--accent-orange)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '2px 8px',
        textAlign: 'center',
        cursor: editable ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{
        fontSize: '0.85rem',
        color: isOverridden ? 'var(--accent-orange)' : 'var(--text-bright)',
        fontWeight: 600,
      }}>
        {format(displayValue as T)}
        {isOverridden && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOverride(undefined);
            }}
            title="Reset to base"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-orange)',
              fontSize: '0.6rem',
              cursor: 'pointer',
              padding: '0 0 0 3px',
              verticalAlign: 'super',
            }}
          >
            {'\u21A9'}
          </button>
        )}
      </div>
    </div>
  );
}
