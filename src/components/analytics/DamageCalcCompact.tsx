/**
 * Design: "Compact Tool"
 * Dense, flat, no cards. Hairline dividers. Spreadsheet-like.
 * Everything visible at once with minimal chrome.
 */

import { useState, useMemo } from 'react';
import { useArmyStore } from '../../state/army-store.ts';
import { useCalcStore } from '../../state/calc-store.ts';
import { createCommonModifier } from '../../calc/modifiers.ts';
import { getKeywordKey, getKeywordLabel, isKeywordActive } from '../../calc/weapon-keywords.ts';
import { getLoadedData } from '../../data/index.ts';
import { normalizeName } from '../../parser/normalize.ts';
import type { Modifier, AttackerUnitConfig, WeaponConfig } from '../../calc/types.ts';
import type { CommonModifierPreset } from '../../calc/modifiers.ts';
import type { WahapediaDatasheet } from '../../types/wahapedia.ts';

const atkPresets: { key: CommonModifierPreset; label: string }[] = [
  { key: 'plus_one_hit', label: '+1H' },
  { key: 'minus_one_hit', label: '-1H' },
  { key: 'plus_one_wound', label: '+1W' },
  { key: 'minus_one_wound', label: '-1W' },
  { key: 'reroll_ones_hit', label: 'RR1H' },
  { key: 'reroll_all_hit', label: 'RRH' },
  { key: 'reroll_ones_wound', label: 'RR1W' },
  { key: 'reroll_all_wound', label: 'RRW' },
  { key: 'plus_one_ap', label: '+AP' },
  { key: 'plus_one_strength', label: '+S' },
];

const defPresets: { key: CommonModifierPreset; label: string }[] = [
  { key: 'cover', label: 'Cov' },
  { key: 'fnp_6', label: 'FNP6' },
  { key: 'fnp_5', label: 'FNP5' },
  { key: 'fnp_4', label: 'FNP4' },
  { key: 'minus_one_damage', label: '-1D' },
];

export function DamageCalcCompact() {
  const armyList = useArmyStore(s => s.armyList);
  const leaderPairings = useArmyStore(s => s.leaderPairings);

  const phaseMode = useCalcStore(s => s.phaseMode);
  const setPhaseMode = useCalcStore(s => s.setPhaseMode);
  const context = useCalcStore(s => s.context);
  const setContext = useCalcStore(s => s.setContext);
  const armyModifiers = useCalcStore(s => s.armyModifiers);
  const attackerConfigs = useCalcStore(s => s.attackerConfigs);
  const addAttackerUnit = useCalcStore(s => s.addAttackerUnit);
  const removeUnit = useCalcStore(s => s.removeAttackerUnit);
  const reorder = useCalcStore(s => s.reorderAttackerUnits);
  const toggleWeapon = useCalcStore(s => s.toggleWeapon);
  const toggleKeyword = useCalcStore(s => s.toggleWeaponKeyword);
  const defenderProfile = useCalcStore(s => s.defenderProfile);
  const lastResult = useCalcStore(s => s.lastResult);

  const pairedCharIds = new Set(Object.values(leaderPairings).flat());
  const addedIds = new Set(attackerConfigs.map(c => c.unitInstanceId));
  const available = armyList?.units.filter(u =>
    !addedIds.has(u.instanceId) && u.weapons.length > 0 && !pairedCharIds.has(u.instanceId)
  ) ?? [];

  // Aggregate results
  const totals = lastResult ? {
    attacks: lastResult.unitResults.reduce((s, ur) => s + ur.weapons.reduce((ws, w) => ws + w.totalAttacks, 0), 0),
    hits: lastResult.unitResults.reduce((s, ur) => s + ur.weapons.reduce((ws, w) => ws + w.hits, 0), 0),
    wounds: lastResult.unitResults.reduce((s, ur) => s + ur.weapons.reduce((ws, w) => ws + w.wounds, 0), 0),
    unsaved: lastResult.unitResults.reduce((s, ur) => s + ur.weapons.reduce((ws, w) => ws + w.unsavedWounds, 0), 0),
    damage: lastResult.totalDamage,
    kills: lastResult.totalModelsKilled,
  } : null;

  const tracker = lastResult?.defenderWoundTracker;

  return (
    <div style={{ fontFamily: 'var(--font-main)', fontSize: '0.8rem', color: 'var(--text)' }}>

      {/* ── Top bar: phase + context + army mods ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phase</span>
        {(['shooting', 'fighting', 'full_sequence'] as const).map(m => (
          <label key={m} style={{ cursor: 'pointer', color: phaseMode === m ? 'var(--accent-green-l)' : 'var(--text-dim)', fontSize: '0.78rem' }}>
            <input type="radio" name="phase" checked={phaseMode === m} onChange={() => setPhaseMode(m)}
              style={{ marginRight: 3, accentColor: 'var(--accent-green)' }} />
            {m === 'shooting' ? 'Shoot' : m === 'fighting' ? 'Fight' : 'Full'}
          </label>
        ))}

        <span style={{ color: 'var(--border-light)' }}>|</span>

        {[
          { key: 'halfRange' as const, label: 'Half Range' },
          { key: 'isCharging' as const, label: 'Charging' },
          { key: 'didNotMove' as const, label: 'Stationary' },
        ].map(c => (
          <label key={c.key} style={{ cursor: 'pointer', color: context[c.key] ? 'var(--accent-blue-l)' : 'var(--text-dim)', fontSize: '0.75rem' }}>
            <input type="checkbox" checked={context[c.key]} onChange={() => setContext({ [c.key]: !context[c.key] })}
              style={{ marginRight: 2, accentColor: 'var(--accent-blue)' }} />
            {c.label}
          </label>
        ))}
      </div>

      {/* Army mods row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 0',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', textTransform: 'uppercase', marginRight: 4 }}>Army</span>
        <InlineModToggles modifiers={armyModifiers} presets={atkPresets} side="attacker" level="army" targetId="" />
      </div>

      {/* ── Two-column: attackers + target ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

        {/* Left: attackers */}
        <div style={{ borderRight: '1px solid var(--border)', paddingRight: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0 6px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Attackers
            </span>
            <select
              value=""
              onChange={e => { if (e.target.value) addAttackerUnit(e.target.value); }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                padding: '2px 6px',
                fontSize: '0.75rem',
                borderRadius: 2,
              }}
            >
              <option value="">+ Add unit</option>
              {available.map(u => {
                const leaders = (leaderPairings[u.instanceId] ?? [])
                  .map(id => armyList!.units.find(x => x.instanceId === id))
                  .filter(Boolean);
                const label = leaders.length > 0
                  ? `${u.displayName} (${u.modelCount}) + ${leaders.map(l => l!.displayName).join(', ')}`
                  : `${u.displayName} (${u.modelCount})`;
                return <option key={u.instanceId} value={u.instanceId}>{label}</option>;
              })}
            </select>
          </div>

          {attackerConfigs.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.75rem' }}>
              No units selected
            </div>
          ) : (
            attackerConfigs.map((config, idx) => (
              <CompactUnitBlock
                key={config.unitInstanceId}
                config={config}
                idx={idx}
                total={attackerConfigs.length}
                onRemove={() => removeUnit(config.unitInstanceId)}
                onMoveUp={() => idx > 0 && reorder(idx, idx - 1)}
                onMoveDown={() => idx < attackerConfigs.length - 1 && reorder(idx, idx + 1)}
                toggleWeapon={toggleWeapon}
                toggleKeyword={toggleKeyword}
                phaseMode={phaseMode}
              />
            ))
          )}
        </div>

        {/* Right: target */}
        <div style={{ paddingLeft: 12 }}>
          <div style={{
            padding: '8px 0 6px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Target
            </span>
          </div>
          <CompactDefender />
        </div>
      </div>

      {/* ── Bottom: results ── */}
      {totals && defenderProfile && tracker && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Results
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>vs {defenderProfile.name}</span>
            {lastResult!.defenderWipedOut && (
              <span style={{ color: 'var(--accent-red)', fontSize: '0.7rem', fontWeight: 600, marginLeft: 'auto' }}>WIPED</span>
            )}
          </div>

          {/* Summary numbers row */}
          <div style={{
            display: 'flex',
            gap: 20,
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'Consolas, monospace',
          }}>
            {[
              { label: 'Atk', value: totals.attacks },
              { label: 'Hit', value: totals.hits },
              { label: 'Wnd', value: totals.wounds },
              { label: 'Unsv', value: totals.unsaved },
              { label: 'Dmg', value: totals.damage },
              { label: 'Kill', value: totals.kills },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 600 }}>{s.value.toFixed(1)}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginLeft: 'auto' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 600 }}>
                {tracker.modelsRemainingAfterEachUnit.length > 0
                  ? `${tracker.modelsRemainingAfterEachUnit[tracker.modelsRemainingAfterEachUnit.length - 1]}/${defenderProfile.modelCount}`
                  : `${defenderProfile.modelCount}/${defenderProfile.modelCount}`}
              </div>
            </div>
          </div>

          {/* Per-unit table */}
          {lastResult!.unitResults.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'Consolas, monospace', marginTop: 4 }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                  <th style={compTh}>#</th>
                  <th style={{ ...compTh, textAlign: 'left' }}>Unit</th>
                  <th style={compTh}>Ph</th>
                  <th style={compTh}>Atk</th>
                  <th style={compTh}>Hit</th>
                  <th style={compTh}>Wnd</th>
                  <th style={compTh}>Dmg</th>
                  <th style={compTh}>Kill</th>
                  <th style={compTh}>W Left</th>
                </tr>
              </thead>
              <tbody>
                {lastResult!.unitResults.map((ur, i) => (
                  <tr key={ur.unitInstanceId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={compTd}>{i + 1}</td>
                    <td style={{ ...compTd, textAlign: 'left', color: 'var(--text-bright)' }}>{ur.unitName}</td>
                    <td style={compTd}>{ur.phase === 'shooting' ? 'S' : 'F'}</td>
                    <td style={compTd}>{ur.weapons.reduce((s, w) => s + w.totalAttacks, 0).toFixed(1)}</td>
                    <td style={compTd}>{ur.weapons.reduce((s, w) => s + w.hits, 0).toFixed(1)}</td>
                    <td style={compTd}>{ur.weapons.reduce((s, w) => s + w.wounds, 0).toFixed(1)}</td>
                    <td style={compTd}>{ur.totalDamageAfterFnp.toFixed(1)}</td>
                    <td style={compTd}>{ur.totalModelsKilled.toFixed(1)}</td>
                    <td style={compTd}>{tracker.remainingWoundsAfterEachUnit[i]?.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Compact Unit Block ── */
function CompactUnitBlock({ config, idx, total, onRemove, onMoveUp, onMoveDown, toggleWeapon, toggleKeyword, phaseMode }: {
  config: AttackerUnitConfig;
  idx: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  toggleWeapon: (uid: string, name: string, profile: string | null) => void;
  toggleKeyword: (uid: string, name: string, profile: string | null, key: string) => void;
  phaseMode: string;
}) {
  const addSourceMod = useCalcStore(s => s.addSourceModifier);
  const removeSourceMod = useCalcStore(s => s.removeSourceModifier);

  const isWeaponInPhase = (w: WeaponConfig) => {
    const isMelee = w.weapon.type.toLowerCase() === 'melee' || w.weapon.range === 'Melee';
    if (phaseMode === 'shooting') return !isMelee;
    if (phaseMode === 'fighting') return isMelee;
    return true; // full_sequence
  };

  const hasSources = config.sources.length > 1;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', width: 16 }}>{idx + 1}.</span>
        <span style={{ color: 'var(--text-bright)', fontWeight: 600, fontSize: '0.82rem', flex: 1 }}>{config.unitName}</span>
        <button onClick={onMoveUp} disabled={idx === 0} style={tinyBtn}>{'\u2191'}</button>
        <button onClick={onMoveDown} disabled={idx === total - 1} style={tinyBtn}>{'\u2193'}</button>
        <button onClick={onRemove} style={{ ...tinyBtn, color: 'var(--accent-red)' }}>{'\u00D7'}</button>
      </div>

      {hasSources ? (
        <>
          {config.sources.map(source => {
            const sourceWeapons = config.weapons.filter(w => w.source?.sourceId === source.sourceId);
            if (sourceWeapons.length === 0) return null;
            const sourceMods = config.sourceModifiers[source.sourceId] ?? [];
            return (
              <div key={source.sourceId} style={{ marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 20 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)' }}>{source.sourceName}</span>
                  {source.isLeader && (
                    <span style={{ fontSize: '0.55rem', color: 'var(--role-char)', fontWeight: 600, textTransform: 'uppercase' }}>LDR</span>
                  )}
                </div>
                {sourceWeapons.map((wc, i) => (
                  <CompactWeaponRow key={`${wc.weapon.name}-${wc.weapon.profileName ?? ''}-${i}`}
                    wc={wc} unitInstanceId={config.unitInstanceId}
                    inPhase={isWeaponInPhase(wc)}
                    toggleWeapon={toggleWeapon} toggleKeyword={toggleKeyword} />
                ))}
                <div style={{ paddingLeft: 20, paddingTop: 1 }}>
                  <InlineModToggles
                    modifiers={sourceMods}
                    presets={atkPresets}
                    side="attacker"
                    level="weapon"
                    targetId={source.sourceId}
                    onToggle={(preset, label, existingId) => {
                      if (existingId) {
                        removeSourceMod(config.unitInstanceId, source.sourceId, existingId);
                      } else {
                        addSourceMod(config.unitInstanceId, source.sourceId, createCommonModifier(preset, 'weapon', label));
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
          {/* Unit mods (all) */}
          <div style={{ paddingLeft: 20, paddingTop: 4 }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginRight: 4 }}>ALL</span>
            <InlineModToggles modifiers={config.modifiers} presets={atkPresets} side="attacker" level="unit" targetId={config.unitInstanceId} />
          </div>
        </>
      ) : (
        <>
          {/* Flat: weapons as dense rows */}
          {config.weapons.map((wc, i) => (
            <CompactWeaponRow key={`${wc.weapon.name}-${wc.weapon.profileName ?? ''}-${i}`}
              wc={wc} unitInstanceId={config.unitInstanceId}
              inPhase={isWeaponInPhase(wc)}
              toggleWeapon={toggleWeapon} toggleKeyword={toggleKeyword} />
          ))}
          {/* Unit mods inline */}
          <div style={{ paddingLeft: 20, paddingTop: 2 }}>
            <InlineModToggles modifiers={config.modifiers} presets={atkPresets} side="attacker" level="unit" targetId={config.unitInstanceId} />
          </div>
        </>
      )}
    </div>
  );
}

/** Single compact weapon row — extracted for reuse in source-grouped and flat modes */
function CompactWeaponRow({ wc, unitInstanceId, inPhase, toggleWeapon, toggleKeyword }: {
  wc: WeaponConfig;
  unitInstanceId: string;
  inPhase: boolean;
  toggleWeapon: (uid: string, name: string, profile: string | null) => void;
  toggleKeyword: (uid: string, name: string, profile: string | null, key: string) => void;
}) {
  const effectiveEnabled = wc.enabled && inPhase;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 2px 20px', opacity: effectiveEnabled ? 1 : 0.35 }}>
      <input type="checkbox" checked={effectiveEnabled} disabled={!inPhase}
        onChange={() => toggleWeapon(unitInstanceId, wc.weapon.name, wc.weapon.profileName)}
        style={{ margin: 0, cursor: inPhase ? 'pointer' : 'default', accentColor: 'var(--accent-green)' }} />
      <span style={{ color: 'var(--text)', fontSize: '0.78rem', minWidth: 120 }}>
        {wc.weapon.profileName ? `${wc.weapon.name} (${wc.weapon.profileName})` : wc.weapon.name}
      </span>
      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontFamily: 'Consolas, monospace' }}>
        {'\u00D7'}{wc.weapon.count} {wc.weapon.A}A {wc.weapon.BS_WS} S{wc.weapon.S} AP{wc.weapon.AP} D{wc.weapon.D}
      </span>
      {wc.parsedKeywords.length > 0 && (
        <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4 }}>
          {wc.parsedKeywords.map(kw => {
            const key = getKeywordKey(kw);
            const active = isKeywordActive(kw, wc.keywordOverrides);
            return (
              <span key={key} onClick={() => toggleKeyword(unitInstanceId, wc.weapon.name, wc.weapon.profileName, key)}
                style={{
                  fontSize: '0.65rem',
                  color: active ? 'var(--accent-blue-l)' : 'var(--text-dim)',
                  textDecoration: active ? 'none' : 'line-through',
                  cursor: 'pointer',
                }}>
                {getKeywordLabel(kw)}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}

/* ── Compact Defender ── */
function CompactDefender() {
  const defenderProfile = useCalcStore(s => s.defenderProfile);
  const setDefenderFromWahapedia = useCalcStore(s => s.setDefenderFromWahapedia);
  const setDefenderCustom = useCalcStore(s => s.setDefenderCustom);
  const addDefMod = useCalcStore(s => s.addDefenderModifier);
  const removeDefMod = useCalcStore(s => s.removeDefenderModifier);

  const [tab, setTab] = useState<'waha' | 'custom'>('waha');
  const [search, setSearch] = useState('');
  const [cName, setCName] = useState('Custom');
  const [cT, setCT] = useState(4);
  const [cSv, setCSv] = useState(3);
  const [cInv, setCInv] = useState('');
  const [cW, setCW] = useState(2);
  const [cM, setCM] = useState(5);
  const [cFnp, setCFnp] = useState('');
  const [cKw, setCKw] = useState('Infantry');

  let data: ReturnType<typeof getLoadedData> | null = null;
  try { data = getLoadedData(); } catch { /* */ }

  const sheets = useMemo(() => {
    if (!data || search.length < 2) return [];
    const norm = normalizeName(search);
    return (Object.values(data.datasheets) as WahapediaDatasheet[])
      .filter(ds => normalizeName(ds.name).includes(norm))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [data, search]);

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <label style={{ cursor: 'pointer', fontSize: '0.75rem', color: tab === 'waha' ? 'var(--accent-green-l)' : 'var(--text-dim)' }}>
          <input type="radio" name="deftab" checked={tab === 'waha'} onChange={() => setTab('waha')} style={{ marginRight: 3 }} />Wahapedia
        </label>
        <label style={{ cursor: 'pointer', fontSize: '0.75rem', color: tab === 'custom' ? 'var(--accent-green-l)' : 'var(--text-dim)' }}>
          <input type="radio" name="deftab" checked={tab === 'custom'} onChange={() => setTab('custom')} style={{ marginRight: 3 }} />Custom
        </label>
      </div>

      {tab === 'waha' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search unit name..."
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '3px 6px', fontSize: '0.75rem', borderRadius: 2 }} />
          {search.length >= 2 && (
            <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 2 }}>
              {sheets.length === 0 ? (
                <div style={{ padding: '3px 6px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>No matches</div>
              ) : sheets.map(ds => (
                <div key={ds.id} onClick={() => { setDefenderFromWahapedia(ds.id, ds.faction_id); setSearch(''); }}
                  style={{ padding: '3px 6px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-head)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span>{ds.name}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{data?.factions[ds.faction_id]?.name ?? ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(6, 50px)', gap: 4, alignItems: 'end' }}>
            <SmallInput label="Name" value={cName} onChange={setCName} />
            <SmallInput label="T" value={cT} onChange={v => setCT(Number(v))} type="number" />
            <SmallInput label="Sv" value={cSv} onChange={v => setCSv(Number(v))} type="number" />
            <SmallInput label="Inv" value={cInv} onChange={setCInv} placeholder="-" />
            <SmallInput label="W" value={cW} onChange={v => setCW(Number(v))} type="number" />
            <SmallInput label="Mdl" value={cM} onChange={v => setCM(Number(v))} type="number" />
            <SmallInput label="FNP" value={cFnp} onChange={setCFnp} placeholder="-" />
          </div>
          <SmallInput label="Keywords" value={cKw} onChange={setCKw} />
          <button onClick={() => {
            const inv = cInv ? parseInt(cInv) : null;
            const fnpVal = cFnp ? parseInt(cFnp) : null;
            setDefenderCustom(cName, cT, cSv, inv, cW, cM, fnpVal, cKw.split(',').map(k => k.trim()).filter(Boolean));
          }} style={{ background: 'transparent', border: '1px solid var(--accent-green)', color: 'var(--accent-green-l)', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', borderRadius: 2, alignSelf: 'flex-start' }}>
            Set Target
          </button>
        </div>
      )}

      {/* Selected defender stats */}
      {defenderProfile && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 6 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '0.82rem', marginBottom: 4 }}>{defenderProfile.name}</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'Consolas, monospace', color: 'var(--text)', marginBottom: 4 }}>
            T{defenderProfile.toughness} Sv{defenderProfile.save}+
            {defenderProfile.invulnerableSave ? ` Inv${defenderProfile.invulnerableSave}+` : ''}
            {' '}W{defenderProfile.wounds} {'\u00D7'}{defenderProfile.modelCount}
            {defenderProfile.feelNoPain ? ` FNP${defenderProfile.feelNoPain}+` : ''}
          </div>
          {defenderProfile.keywords.length > 0 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: 4 }}>{defenderProfile.keywords.join(', ')}</div>
          )}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {defPresets.map(p => {
              const active = defenderProfile.modifiers.some(m => m.source === p.label);
              return (
                <span key={p.key} onClick={() => {
                  const existing = defenderProfile.modifiers.find(m => m.source === p.label);
                  if (existing) { removeDefMod(existing.id); }
                  else { addDefMod(createCommonModifier(p.key, 'army', p.label)); }
                }} style={{
                  fontSize: '0.65rem',
                  padding: '1px 5px',
                  cursor: 'pointer',
                  color: active ? 'var(--accent-gold)' : 'var(--text-dim)',
                  borderBottom: active ? '1px solid var(--accent-gold)' : '1px solid transparent',
                }}>{active ? '\u2022 ' : ''}{p.label}</span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline Modifier Toggles ── */
function InlineModToggles({ modifiers, presets, side, level, targetId, onToggle }: {
  modifiers: Modifier[];
  presets: { key: CommonModifierPreset; label: string }[];
  side: 'attacker' | 'defender';
  level: 'army' | 'unit' | 'weapon';
  targetId: string;
  onToggle?: (preset: CommonModifierPreset, label: string, existingId: string | null) => void;
}) {
  const addMod = useCalcStore(s => s.addModifier);
  const removeMod = useCalcStore(s => s.removeModifier);

  return (
    <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
      {presets.map(p => {
        const active = modifiers.some(m => m.source === p.label);
        return (
          <span key={p.key} onClick={() => {
            const existing = modifiers.find(m => m.source === p.label);
            if (onToggle) {
              onToggle(p.key, p.label, existing?.id ?? null);
            } else if (existing) {
              removeMod(level, targetId, existing.id);
            } else {
              addMod(level, targetId, createCommonModifier(p.key, level, p.label));
            }
          }} style={{
            fontSize: '0.65rem',
            padding: '1px 4px',
            cursor: 'pointer',
            color: active ? (side === 'attacker' ? 'var(--accent-green-l)' : 'var(--accent-gold)') : 'var(--text-dim)',
            borderBottom: active ? `1px solid ${side === 'attacker' ? 'var(--accent-green)' : 'var(--accent-gold)'}` : '1px solid transparent',
          }}>{active ? '\u2022 ' : ''}{p.label}</span>
        );
      })}
    </span>
  );
}

function SmallInput({ label, value, onChange, type, placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{label}</div>
      <input type={type ?? 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '2px 4px', fontSize: '0.72rem', borderRadius: 2 }} />
    </div>
  );
}

const tinyBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.72rem', padding: '0 3px',
};
const compTh: React.CSSProperties = { padding: '3px 6px', textAlign: 'right', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' };
const compTd: React.CSSProperties = { padding: '3px 6px', textAlign: 'right', fontSize: '0.75rem' };
