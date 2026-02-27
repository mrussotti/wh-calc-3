/** Per-weapon enable/disable + keyword toggle chips + stat override editing */

import { useState } from 'react';
import { useCalcStore } from '../../state/calc-store.ts';
import type { WeaponConfig } from '../../calc/types.ts';
import { getKeywordKey, getKeywordLabel, isKeywordActive } from '../../calc/weapon-keywords.ts';

interface WeaponSelectorProps {
  unitInstanceId: string;
  weapons: WeaponConfig[];
  phaseMode: 'shooting' | 'fighting' | 'full_sequence';
}

export function WeaponSelector({ unitInstanceId, weapons, phaseMode }: WeaponSelectorProps) {
  const toggleWeapon = useCalcStore(s => s.toggleWeapon);
  const toggleKeyword = useCalcStore(s => s.toggleWeaponKeyword);

  if (weapons.length === 0) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontStyle: 'italic' }}>No weapons</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {weapons.map((wc, i) => {
        const isMelee = wc.weapon.type.toLowerCase() === 'melee' || wc.weapon.range === 'Melee';
        const inPhase = phaseMode === 'full_sequence' ? true
          : phaseMode === 'shooting' ? !isMelee : isMelee;
        return (
          <WeaponRow
            key={`${wc.weapon.name}-${wc.weapon.profileName ?? ''}-${i}`}
            unitInstanceId={unitInstanceId}
            wc={wc}
            inPhase={inPhase}
            onToggle={toggleWeapon}
            onToggleKeyword={toggleKeyword}
          />
        );
      })}
    </div>
  );
}

function WeaponRow({ unitInstanceId, wc, inPhase, onToggle, onToggleKeyword }: {
  unitInstanceId: string;
  wc: WeaponConfig;
  inPhase: boolean;
  onToggle: (unitId: string, name: string, profile: string | null) => void;
  onToggleKeyword: (unitId: string, name: string, profile: string | null, key: string) => void;
}) {
  const weapon = wc.weapon;
  const displayName = weapon.profileName
    ? `${weapon.name} - ${weapon.profileName}`
    : weapon.name;

  const [editing, setEditing] = useState(false);
  const so = wc.statOverrides;
  const hasOverrides = so && Object.values(so).some(v => v !== undefined);

  const effectiveEnabled = wc.enabled && inPhase;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '4px 0',
      opacity: effectiveEnabled ? 1 : 0.4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={effectiveEnabled}
          disabled={!inPhase}
          onChange={() => onToggle(unitInstanceId, weapon.name, weapon.profileName)}
          style={{ cursor: inPhase ? 'pointer' : 'default' }}
          title={!inPhase ? `Not used in ${weapon.type.toLowerCase() === 'melee' || weapon.range === 'Melee' ? 'shooting' : 'fighting'} phase` : undefined}
        />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-bright)', fontWeight: 500 }}>
          {displayName}
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
          {'\u00D7'}{weapon.count}
        </span>
        {editing ? (
          <WeaponStatEditor unitInstanceId={unitInstanceId} wc={wc} />
        ) : (
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <StatValue label="A" base={weapon.A} override={so?.A} />
            <StatValue label="" base={weapon.BS_WS} override={so?.BS_WS} />
            {' '}S<StatValue label="" base={weapon.S} override={so?.S} />
            {' '}AP<StatValue label="" base={weapon.AP} override={so?.AP} />
            {' '}D<StatValue label="" base={weapon.D} override={so?.D} />
          </span>
        )}
        <button
          onClick={() => setEditing(!editing)}
          title={editing ? 'Close editor' : 'Edit stats'}
          style={{
            background: 'transparent',
            border: `1px solid ${hasOverrides ? 'var(--accent-orange)' : 'var(--border)'}`,
            color: hasOverrides ? 'var(--accent-orange)' : 'var(--text-dim)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.7rem',
            cursor: 'pointer',
            marginLeft: editing ? 'auto' : 0,
          }}
        >
          {editing ? '\u2715' : '\u270E'}
        </button>
      </div>

      {/* Keyword chips */}
      {wc.parsedKeywords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginLeft: 24 }}>
          {wc.parsedKeywords.map(kw => {
            const key = getKeywordKey(kw);
            const active = isKeywordActive(kw, wc.keywordOverrides);
            return (
              <button
                key={key}
                onClick={() => onToggleKeyword(unitInstanceId, weapon.name, weapon.profileName, key)}
                style={{
                  background: active ? 'rgba(74, 144, 217, 0.15)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
                  color: active ? 'var(--accent-blue-l)' : 'var(--text-dim)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                {active ? '\u25A3 ' : '\u25A1 '}{getKeywordLabel(kw)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Inline display of a stat value, orange when overridden */
function StatValue({ label, base, override }: { label: string; base: string; override?: string }) {
  const isOverridden = override !== undefined;
  const display = override ?? base;
  return (
    <span style={{
      color: isOverridden ? 'var(--accent-orange)' : 'inherit',
      fontWeight: isOverridden ? 700 : 'inherit',
    }}>
      {label}{display}
    </span>
  );
}

/** Inline stat editor row for a weapon */
function WeaponStatEditor({ unitInstanceId, wc }: { unitInstanceId: string; wc: WeaponConfig }) {
  const setOverride = useCalcStore(s => s.setWeaponStatOverride);
  const clearOverrides = useCalcStore(s => s.clearWeaponStatOverrides);
  const weapon = wc.weapon;
  const so = wc.statOverrides;

  const stats: Array<{ key: 'A' | 'BS_WS' | 'S' | 'AP' | 'D'; label: string; base: string }> = [
    { key: 'A', label: 'A', base: weapon.A },
    { key: 'BS_WS', label: 'BS/WS', base: weapon.BS_WS },
    { key: 'S', label: 'S', base: weapon.S },
    { key: 'AP', label: 'AP', base: weapon.AP },
    { key: 'D', label: 'D', base: weapon.D },
  ];

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
      {stats.map(s => {
        const overrideVal = so?.[s.key];
        const isOverridden = overrideVal !== undefined;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{s.label}</span>
            <input
              type="text"
              defaultValue={overrideVal ?? s.base}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val === '' || val === s.base) {
                  setOverride(unitInstanceId, weapon.name, weapon.profileName, s.key, undefined);
                } else {
                  setOverride(unitInstanceId, weapon.name, weapon.profileName, s.key, val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              style={{
                width: 32,
                background: 'var(--bg-stat)',
                border: `1px solid ${isOverridden ? 'var(--accent-orange)' : 'var(--border)'}`,
                color: isOverridden ? 'var(--accent-orange)' : 'var(--text-bright)',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 4px',
                fontSize: '0.72rem',
                fontWeight: isOverridden ? 700 : 400,
                textAlign: 'center',
              }}
            />
            {isOverridden && (
              <button
                onClick={() => setOverride(unitInstanceId, weapon.name, weapon.profileName, s.key, undefined)}
                title="Reset to base"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-orange)',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {'\u21A9'}
              </button>
            )}
          </div>
        );
      })}
      {so && Object.values(so).some(v => v !== undefined) && (
        <button
          onClick={() => clearOverrides(unitInstanceId, weapon.name, weapon.profileName)}
          title="Reset all"
          style={{
            background: 'transparent',
            border: '1px solid var(--accent-orange)',
            color: 'var(--accent-orange)',
            fontSize: '0.6rem',
            padding: '1px 4px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          Reset All
        </button>
      )}
    </div>
  );
}
