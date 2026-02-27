/** Modifier controls — steppers for +/- values, dropdowns for rerolls, toggles for on/off */

import { useState } from 'react';
import { useCalcStore } from '../../state/calc-store.ts';
import { createCommonModifier, type CommonModifierPreset } from '../../calc/modifiers.ts';
import type { Modifier, ModifierLevel } from '../../calc/types.ts';
import { getModifierLevelColor, type ModifierColorLevel } from '../../calc/modifier-colors.ts';

type StoreModifierLevel = 'army' | 'unit' | 'weapon';

interface ModifierControlsProps {
  side: 'attacker' | 'defender';
  level: StoreModifierLevel;
  targetId: string;
  modifiers: Modifier[];
  inheritedModifiers?: Modifier[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface ModifierOps {
  add: (mod: Modifier) => void;
  remove: (id: string) => void;
}

// === Helpers: read current modifier state from array ===

function readInt(mods: Modifier[], category: string): number {
  let total = 0;
  for (const m of mods) {
    if (m.type.category === category && 'value' in m.type) total += (m.type as { value: number }).value;
  }
  return total;
}

function readReroll(mods: Modifier[], category: string): 'none' | 'ones' | 'all_failed' | 'all_non_crit' {
  for (const m of mods) {
    if (m.type.category === category && 'scope' in m.type) return (m.type as { scope: 'ones' | 'all_failed' | 'all_non_crit' }).scope;
  }
  return 'none';
}

function readToggle(mods: Modifier[], category: string): boolean {
  return mods.some(m => m.type.category === category);
}

function readFnp(mods: Modifier[]): number | null {
  for (const m of mods) {
    if (m.type.category === 'feel_no_pain' && 'value' in m.type) return (m.type as { value: number }).value;
  }
  return null;
}

function readThreshold(mods: Modifier[], category: string): number | null {
  for (const m of mods) {
    if (m.type.category === category && 'value' in m.type) return (m.type as { value: number }).value;
  }
  return null;
}


// === Helpers: set modifier value (remove old, add new) ===

function removeByCategory(mods: Modifier[], category: string, ops: ModifierOps) {
  for (const m of mods) {
    if (m.type.category === category) ops.remove(m.id);
  }
}

type IntPresetMap = Record<number, { preset: CommonModifierPreset; label: string }>;

const hitPresets: IntPresetMap = {
  1: { preset: 'plus_one_hit', label: '+1 Hit' },
  [-1]: { preset: 'minus_one_hit', label: '-1 Hit' },
};

const woundPresets: IntPresetMap = {
  1: { preset: 'plus_one_wound', label: '+1 Wnd' },
  [-1]: { preset: 'minus_one_wound', label: '-1 Wnd' },
};

const apPresets: IntPresetMap = {
  1: { preset: 'plus_one_ap', label: '+1 AP' },
};

const strPresets: IntPresetMap = {
  1: { preset: 'plus_one_strength', label: '+1 S' },
};

const attacksPresets: IntPresetMap = {
  1: { preset: 'plus_one_attacks', label: '+1 Atk' },
  [-1]: { preset: 'minus_one_attacks', label: '-1 Atk' },
};

const sustainedHitsPresets: IntPresetMap = {
  1: { preset: 'sustained_hits_1', label: 'Sus Hits 1' },
  2: { preset: 'sustained_hits_2', label: 'Sus Hits 2' },
};

const defHitPresets: IntPresetMap = {
  [-1]: { preset: 'minus_one_hit_def', label: '-1 Hit (Def)' },
};

const defWoundPresets: IntPresetMap = {
  [-1]: { preset: 'minus_one_wound_def', label: '-1 Wnd (Def)' },
};

type RerollPresetMap = Record<string, { preset: CommonModifierPreset; label: string }>;

const rerollHitPresets: RerollPresetMap = {
  ones: { preset: 'reroll_ones_hit', label: 'RR1s Hit' },
  all_failed: { preset: 'reroll_all_hit', label: 'RR Hit' },
  all_non_crit: { preset: 'reroll_fish_hit', label: 'Fish Hit' },
};

const rerollWoundPresets: RerollPresetMap = {
  ones: { preset: 'reroll_ones_wound', label: 'RR1s Wnd' },
  all_failed: { preset: 'reroll_all_wound', label: 'RR Wnd' },
  all_non_crit: { preset: 'reroll_fish_wound', label: 'Fish Wnd' },
};

const rerollSavePresets: RerollPresetMap = {
  ones: { preset: 'reroll_ones_save', label: 'RR1s Sv' },
  all_failed: { preset: 'reroll_all_save', label: 'RR Sv' },
};

function setIntMod(mods: Modifier[], category: string, value: number, presets: IntPresetMap, level: ModifierLevel, ops: ModifierOps) {
  removeByCategory(mods, category, ops);
  if (value === 0) return;
  const p = presets[value];
  if (p) {
    ops.add(createCommonModifier(p.preset, level, p.label));
  } else {
    // Direct modifier for values outside the preset map
    const sign = value > 0 ? '+' : '';
    const label = `${sign}${value}`;
    ops.add({
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: label,
      level,
      type: { category, value } as Modifier['type'],
    });
  }
}

function setRerollMod(mods: Modifier[], category: string, value: string, presets: RerollPresetMap, level: ModifierLevel, ops: ModifierOps) {
  removeByCategory(mods, category, ops);
  const p = presets[value];
  if (p) ops.add(createCommonModifier(p.preset, level, p.label));
}

function setToggleMod(mods: Modifier[], category: string, on: boolean, preset: CommonModifierPreset, label: string, level: ModifierLevel, ops: ModifierOps) {
  removeByCategory(mods, category, ops);
  if (on) ops.add(createCommonModifier(preset, level, label));
}

function setFnpMod(mods: Modifier[], value: number | null, level: ModifierLevel, ops: ModifierOps) {
  removeByCategory(mods, 'feel_no_pain', ops);
  if (value === 6) ops.add(createCommonModifier('fnp_6', level, 'FNP 6+'));
  else if (value === 5) ops.add(createCommonModifier('fnp_5', level, 'FNP 5+'));
  else if (value === 4) ops.add(createCommonModifier('fnp_4', level, 'FNP 4+'));
}

function setThresholdMod(mods: Modifier[], category: string, value: number | null, preset5: CommonModifierPreset, label: string, level: ModifierLevel, ops: ModifierOps) {
  removeByCategory(mods, category, ops);
  if (value === 5) ops.add(createCommonModifier(preset5, level, label));
}


// === Color helpers ===

function toColorLevel(level: ModifierLevel): ModifierColorLevel {
  if (level === 'army') return 'army';
  if (level === 'unit') return 'unit';
  if (level === 'model') return 'model';
  return 'weapon';
}

function levelLabel(level: ModifierLevel): string {
  if (level === 'army') return 'Army';
  if (level === 'unit') return 'Unit';
  if (level === 'model') return 'Model';
  return 'Weapon';
}

// === Main component ===

export function ModifierControls({ side, level, targetId, modifiers, inheritedModifiers, collapsible, defaultExpanded }: ModifierControlsProps) {
  const addModifier = useCalcStore(s => s.addModifier);
  const removeModifier = useCalcStore(s => s.removeModifier);
  const addDefenderModifier = useCalcStore(s => s.addDefenderModifier);
  const removeDefenderModifier = useCalcStore(s => s.removeDefenderModifier);
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);

  const colorLevel: ModifierColorLevel = side === 'defender' ? 'model' : level;
  const colors = getModifierLevelColor(colorLevel);

  const ops: ModifierOps = side === 'defender'
    ? { add: addDefenderModifier, remove: removeDefenderModifier }
    : {
        add: (mod) => addModifier(level, targetId, mod),
        remove: (id) => removeModifier(level, targetId, id),
      };

  const body = side === 'attacker'
    ? <AttackerModBody modifiers={modifiers} inheritedModifiers={inheritedModifiers} level={level} colors={colors} ops={ops} />
    : <DefenderModBody modifiers={modifiers} level={level} colors={colors} ops={ops} />;

  if (collapsible) {
    return (
      <div>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            userSelect: 'none',
            marginBottom: expanded ? 6 : 0,
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {expanded ? '\u25BC' : '\u25B6'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            Modifiers
          </span>
          {!expanded && (modifiers.length > 0 || (inheritedModifiers && inheritedModifiers.length > 0)) && (
            <CollapsedBadges ownCount={modifiers.length} inherited={inheritedModifiers} />
          )}
        </div>
        {expanded && body}
      </div>
    );
  }

  return body;
}

// === Attacker modifier body: steppers + dropdowns ===

function AttackerModBody({ modifiers, inheritedModifiers, level, colors, ops }: {
  modifiers: Modifier[];
  inheritedModifiers?: Modifier[];
  level: ModifierLevel;
  colors: { text: string; bg: string; border: string };
  ops: ModifierOps;
}) {
  const hitMod = readInt(modifiers, 'hit_roll_modifier');
  const woundMod = readInt(modifiers, 'wound_roll_modifier');
  const apMod = readInt(modifiers, 'ap_modifier');
  const strMod = readInt(modifiers, 'strength_modifier');
  const atkMod = readInt(modifiers, 'attacks_modifier');
  const rrHits = readReroll(modifiers, 'reroll_hits');
  const rrWounds = readReroll(modifiers, 'reroll_wounds');
  const critHit = readThreshold(modifiers, 'critical_hit_threshold');
  const critWound = readThreshold(modifiers, 'critical_wound_threshold');
  const sustainedHits = readInt(modifiers, 'sustained_hits');
  const hasLethalHits = readToggle(modifiers, 'lethal_hits');
  const hasDevWounds = readToggle(modifiers, 'devastating_wounds');

  // Inherited values from parent levels
  const inh = inheritedModifiers ?? [];
  const inhHit = readInt(inh, 'hit_roll_modifier');
  const inhWound = readInt(inh, 'wound_roll_modifier');
  const inhAp = readInt(inh, 'ap_modifier');
  const inhStr = readInt(inh, 'strength_modifier');
  const inhAtk = readInt(inh, 'attacks_modifier');
  const inhRrHits = readReroll(inh, 'reroll_hits');
  const inhRrWounds = readReroll(inh, 'reroll_wounds');
  const inhSusHits = readInt(inh, 'sustained_hits');
  const inhLethalHits = readToggle(inh, 'lethal_hits');
  const inhDevWounds = readToggle(inh, 'devastating_wounds');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', alignItems: 'center' }}>
      <ModStepper label="Hit" value={hitMod} inheritedValue={inhHit} min={-1} max={1} colors={colors}
        onChange={v => setIntMod(modifiers, 'hit_roll_modifier', v, hitPresets, level, ops)} />
      <RerollSelect label="RR Hit" value={rrHits} inheritedValue={inhRrHits} colors={colors} showFish
        onChange={v => setRerollMod(modifiers, 'reroll_hits', v, rerollHitPresets, level, ops)} />
      <ModStepper label="Wound" value={woundMod} inheritedValue={inhWound} min={-1} max={1} colors={colors}
        onChange={v => setIntMod(modifiers, 'wound_roll_modifier', v, woundPresets, level, ops)} />
      <RerollSelect label="RR Wnd" value={rrWounds} inheritedValue={inhRrWounds} colors={colors} showFish
        onChange={v => setRerollMod(modifiers, 'reroll_wounds', v, rerollWoundPresets, level, ops)} />
      <ModStepper label="AP" value={apMod} inheritedValue={inhAp} min={0} max={3} colors={colors}
        onChange={v => setIntMod(modifiers, 'ap_modifier', v, apPresets, level, ops)} />
      <ModStepper label="Str" value={strMod} inheritedValue={inhStr} min={0} max={3} colors={colors}
        onChange={v => setIntMod(modifiers, 'strength_modifier', v, strPresets, level, ops)} />
      <ModStepper label="Atk" value={atkMod} inheritedValue={inhAtk} min={-3} max={10} colors={colors}
        onChange={v => setIntMod(modifiers, 'attacks_modifier', v, attacksPresets, level, ops)} />
      <ThresholdSelect label="Crit Hit" value={critHit} colors={colors}
        onChange={v => setThresholdMod(modifiers, 'critical_hit_threshold', v, 'crit_hit_5', 'Crit Hit 5+', level, ops)} />
      <ThresholdSelect label="Crit Wnd" value={critWound} colors={colors}
        onChange={v => setThresholdMod(modifiers, 'critical_wound_threshold', v, 'crit_wound_5', 'Crit Wnd 5+', level, ops)} />
      <ModStepper label="Sus Hits" value={sustainedHits} inheritedValue={inhSusHits} min={0} max={3} colors={colors}
        onChange={v => setIntMod(modifiers, 'sustained_hits', v, sustainedHitsPresets, level, ops)} />
      <ModToggle label="Lethal Hits" active={hasLethalHits || inhLethalHits} colors={colors}
        onChange={v => setToggleMod(modifiers, 'lethal_hits', v, 'lethal_hits', 'Lethal Hits', level, ops)} />
      <ModToggle label="Dev Wounds" active={hasDevWounds || inhDevWounds} colors={colors}
        onChange={v => setToggleMod(modifiers, 'devastating_wounds', v, 'devastating_wounds', 'Dev Wounds', level, ops)} />
    </div>
  );
}

// === Defender modifier body: toggles + dropdown ===

function DefenderModBody({ modifiers, level, colors, ops }: {
  modifiers: Modifier[];
  level: ModifierLevel;
  colors: { text: string; bg: string; border: string };
  ops: ModifierOps;
}) {
  const hasCover = readToggle(modifiers, 'save_modifier');
  const fnp = readFnp(modifiers);
  const hasDmgReduce = readToggle(modifiers, 'damage_reduction');
  const defHitMod = readInt(modifiers, 'hit_modifier_defense');
  const defWoundMod = readInt(modifiers, 'wound_modifier_defense');
  const hasHalfDmg = readToggle(modifiers, 'half_damage');
  const rrSaves = readReroll(modifiers, 'reroll_saves');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', alignItems: 'center' }}>
      <ModStepper label="Hit Mod" value={defHitMod} min={-1} max={0} colors={colors}
        onChange={v => setIntMod(modifiers, 'hit_modifier_defense', v, defHitPresets, level, ops)} />
      <ModStepper label="Wnd Mod" value={defWoundMod} min={-1} max={0} colors={colors}
        onChange={v => setIntMod(modifiers, 'wound_modifier_defense', v, defWoundPresets, level, ops)} />
      <ModToggle label="Cover" active={hasCover} colors={colors}
        onChange={v => setToggleMod(modifiers, 'save_modifier', v, 'cover', 'Cover', level, ops)} />
      <FnpSelect value={fnp} colors={colors}
        onChange={v => setFnpMod(modifiers, v, level, ops)} />
      <ModToggle label="-1 Dmg" active={hasDmgReduce} colors={colors}
        onChange={v => setToggleMod(modifiers, 'damage_reduction', v, 'minus_one_damage', '-1 Dmg', level, ops)} />
      <ModToggle label="Half Dmg" active={hasHalfDmg} colors={colors}
        onChange={v => setToggleMod(modifiers, 'half_damage', v, 'half_damage', 'Half Dmg', level, ops)} />
      <RerollSelect label="RR Saves" value={rrSaves} colors={colors}
        onChange={v => setRerollMod(modifiers, 'reroll_saves', v, rerollSavePresets, level, ops)} />
    </div>
  );
}

// === Source-level modifier controls ===

interface SourceModifierControlsProps {
  unitInstanceId: string;
  sourceId: string;
  modifiers: Modifier[];
  inheritedModifiers?: Modifier[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function SourceModifierControls({ unitInstanceId, sourceId, modifiers, inheritedModifiers, collapsible, defaultExpanded }: SourceModifierControlsProps) {
  const addSourceModifier = useCalcStore(s => s.addSourceModifier);
  const removeSourceModifier = useCalcStore(s => s.removeSourceModifier);
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);

  const colors = getModifierLevelColor('source');

  const ops: ModifierOps = {
    add: (mod) => addSourceModifier(unitInstanceId, sourceId, mod),
    remove: (id) => removeSourceModifier(unitInstanceId, sourceId, id),
  };

  const body = <AttackerModBody modifiers={modifiers} inheritedModifiers={inheritedModifiers} level="weapon" colors={colors} ops={ops} />;

  if (collapsible) {
    return (
      <div>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            userSelect: 'none',
            marginBottom: expanded ? 6 : 0,
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {expanded ? '\u25BC' : '\u25B6'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            Modifiers
          </span>
          {!expanded && (modifiers.length > 0 || (inheritedModifiers && inheritedModifiers.length > 0)) && (
            <CollapsedBadges ownCount={modifiers.length} inherited={inheritedModifiers} />
          )}
        </div>
        {expanded && body}
      </div>
    );
  }

  return body;
}

// === UI Primitives ===

/** Stepper: label [-] effective_value [+] with inherited indicator */
function ModStepper({ label, value, inheritedValue = 0, min, max, colors, onChange }: {
  label: string;
  value: number;
  inheritedValue?: number;
  min: number;
  max: number;
  colors: { text: string; bg: string; border: string };
  onChange: (v: number) => void;
}) {
  const effective = value + inheritedValue;
  const isLocalActive = value !== 0;
  const isInheritedActive = inheritedValue !== 0;
  const isActive = effective !== 0;
  const displayVal = effective > 0 ? `+${effective}` : String(effective);

  // Color: local color when local is set, inherited color when purely inherited, dim when zero
  const inheritedColors = getModifierLevelColor('army');
  const valColor = isLocalActive ? colors.text
    : isInheritedActive ? inheritedColors.text
    : 'var(--text-dim)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: 38, flexShrink: 0 }}>{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          background: 'transparent',
          border: `1px solid ${value > min ? 'var(--border-light)' : 'var(--border)'}`,
          color: value > min ? 'var(--text-dim)' : 'var(--border)',
          width: 20, height: 20,
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          cursor: value > min ? 'pointer' : 'default',
          padding: 0, lineHeight: '18px',
        }}
      >{'\u2212'}</button>
      <span style={{
        fontSize: '0.75rem',
        fontWeight: isActive ? 700 : 400,
        color: valColor,
        width: 24,
        textAlign: 'center',
      }}>{displayVal}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          background: 'transparent',
          border: `1px solid ${value < max ? 'var(--border-light)' : 'var(--border)'}`,
          color: value < max ? 'var(--text-dim)' : 'var(--border)',
          width: 20, height: 20,
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          cursor: value < max ? 'pointer' : 'default',
          padding: 0, lineHeight: '18px',
        }}
      >+</button>
      {isInheritedActive && (
        <span
          title={`${inheritedValue > 0 ? '+' : ''}${inheritedValue} inherited`}
          style={{
            fontSize: '0.55rem',
            color: inheritedColors.text,
            background: inheritedColors.bg,
            border: `1px dashed ${inheritedColors.border}`,
            padding: '0 3px',
            borderRadius: 6,
            opacity: 0.8,
          }}
        >{'\u2191'}</span>
      )}
    </div>
  );
}

/** Reroll dropdown: label [None/1s/All/Fish] with inherited indicator */
const rerollPower: Record<string, number> = { none: 0, ones: 1, all_failed: 2, all_non_crit: 3 };

function RerollSelect({ label, value, inheritedValue = 'none', colors, showFish, onChange }: {
  label: string;
  value: 'none' | 'ones' | 'all_failed' | 'all_non_crit';
  inheritedValue?: 'none' | 'ones' | 'all_failed' | 'all_non_crit';
  colors: { text: string; bg: string; border: string };
  showFish?: boolean;
  onChange: (v: string) => void;
}) {
  // Effective is the strongest of local vs inherited
  const effective = rerollPower[value] >= rerollPower[inheritedValue] ? value : inheritedValue;
  const isActive = effective !== 'none';
  const isLocalActive = value !== 'none';
  const isInheritedActive = inheritedValue !== 'none';

  const inheritedColors = getModifierLevelColor('army');
  const activeColors = isLocalActive ? colors : isInheritedActive ? inheritedColors : colors;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: 42, flexShrink: 0 }}>{label}</span>
      <select
        value={effective}
        onChange={e => onChange(e.target.value)}
        style={{
          background: isActive ? activeColors.bg : 'var(--bg-stat)',
          border: `1px solid ${isActive ? activeColors.border : 'var(--border)'}`,
          color: isActive ? activeColors.text : 'var(--text-dim)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: isActive ? 600 : 400,
          padding: '2px 4px',
          cursor: 'pointer',
        }}
      >
        <option value="none">None</option>
        <option value="ones">1s</option>
        <option value="all_failed">All Failed</option>
        {showFish && <option value="all_non_crit">Fish for Crits</option>}
      </select>
      {isInheritedActive && !isLocalActive && (
        <span
          title="Inherited from parent level"
          style={{
            fontSize: '0.55rem',
            color: inheritedColors.text,
            background: inheritedColors.bg,
            border: `1px dashed ${inheritedColors.border}`,
            padding: '0 3px',
            borderRadius: 6,
            opacity: 0.8,
          }}
        >{'\u2191'}</span>
      )}
    </div>
  );
}

/** Toggle: label [on/off button] */
function ModToggle({ label, active, colors, onChange }: {
  label: string;
  active: boolean;
  colors: { text: string; bg: string; border: string };
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => onChange(!active)}
        style={{
          background: active ? colors.bg : 'transparent',
          border: `1px solid ${active ? colors.border : 'var(--border)'}`,
          color: active ? colors.text : 'var(--text-dim)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: active ? 600 : 400,
          cursor: 'pointer',
        }}
      >
        {active ? '\u25A3 ' : ''}{label}
      </button>
    </div>
  );
}

/** FNP dropdown: None / 6+ / 5+ / 4+ */
function FnpSelect({ value, colors, onChange }: {
  value: number | null;
  colors: { text: string; bg: string; border: string };
  onChange: (v: number | null) => void;
}) {
  const isActive = value !== null;
  const selectVal = value !== null ? String(value) : 'none';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: 30, flexShrink: 0 }}>FNP</span>
      <select
        value={selectVal}
        onChange={e => {
          const v = e.target.value;
          onChange(v === 'none' ? null : parseInt(v));
        }}
        style={{
          background: isActive ? colors.bg : 'var(--bg-stat)',
          border: `1px solid ${isActive ? colors.border : 'var(--border)'}`,
          color: isActive ? colors.text : 'var(--text-dim)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: isActive ? 600 : 400,
          padding: '2px 4px',
          cursor: 'pointer',
        }}
      >
        <option value="none">None</option>
        <option value="6">6+</option>
        <option value="5">5+</option>
        <option value="4">4+</option>
      </select>
    </div>
  );
}

/** Threshold dropdown: None / 5+ (for crit hit/wound thresholds) */
function ThresholdSelect({ label, value, colors, onChange }: {
  label: string;
  value: number | null;
  colors: { text: string; bg: string; border: string };
  onChange: (v: number | null) => void;
}) {
  const isActive = value !== null;
  const selectVal = value !== null ? String(value) : 'none';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: 50, flexShrink: 0 }}>{label}</span>
      <select
        value={selectVal}
        onChange={e => {
          const v = e.target.value;
          onChange(v === 'none' ? null : parseInt(v));
        }}
        style={{
          background: isActive ? colors.bg : 'var(--bg-stat)',
          border: `1px solid ${isActive ? colors.border : 'var(--border)'}`,
          color: isActive ? colors.text : 'var(--text-dim)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: isActive ? 600 : 400,
          padding: '2px 4px',
          cursor: 'pointer',
        }}
      >
        <option value="none">None</option>
        <option value="5">5+</option>
      </select>
    </div>
  );
}

/** Collapsed badge showing own + inherited modifier counts */
function CollapsedBadges({ ownCount, inherited }: { ownCount: number; inherited?: Modifier[] }) {
  const inheritedByLevel: Record<string, number> = {};
  if (inherited) {
    for (const m of inherited) {
      const label = levelLabel(m.level);
      inheritedByLevel[label] = (inheritedByLevel[label] ?? 0) + 1;
    }
  }

  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {ownCount > 0 && (
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'var(--text)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--border-light)',
          padding: '0 5px',
          borderRadius: 8,
        }}>
          {ownCount} own
        </span>
      )}
      {Object.entries(inheritedByLevel).map(([label, count]) => {
        const level = label.toLowerCase() as ModifierLevel;
        const c = getModifierLevelColor(toColorLevel(level));
        return (
          <span
            key={label}
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: c.text,
              background: c.bg,
              border: `1px dashed ${c.border}`,
              padding: '0 5px',
              borderRadius: 8,
              opacity: 0.75,
            }}
          >
            {count} {label.toLowerCase()}
          </span>
        );
      })}
    </span>
  );
}
