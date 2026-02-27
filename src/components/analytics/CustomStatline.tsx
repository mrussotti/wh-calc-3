/** Manual T/Sv/Inv/W/Models/FNP entry for custom defender */

import { useState } from 'react';
import { useCalcStore } from '../../state/calc-store.ts';

export function CustomStatline() {
  const setDefenderCustom = useCalcStore(s => s.setDefenderCustom);

  const [name, setName] = useState('Custom Target');
  const [toughness, setToughness] = useState(4);
  const [save, setSave] = useState(3);
  const [invuln, setInvuln] = useState('');
  const [wounds, setWounds] = useState(2);
  const [models, setModels] = useState(5);
  const [fnp, setFnp] = useState('');
  const [keywords, setKeywords] = useState('Infantry');

  const handleApply = () => {
    const inv = invuln ? parseInt(invuln, 10) : null;
    const fnpVal = fnp ? parseInt(fnp, 10) : null;
    const kw = keywords.split(',').map(k => k.trim()).filter(Boolean);
    setDefenderCustom(name, toughness, save, inv, wounds, models, fnpVal, kw);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <StatInput label="Name" value={name} onChange={setName} type="text" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <StatInput label="T" value={toughness} onChange={v => setToughness(Number(v))} type="number" />
        <StatInput label="Sv" value={save} onChange={v => setSave(Number(v))} type="number" suffix="+" />
        <StatInput label="Inv" value={invuln} onChange={setInvuln} type="text" placeholder="-" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <StatInput label="W" value={wounds} onChange={v => setWounds(Number(v))} type="number" />
        <StatInput label="Models" value={models} onChange={v => setModels(Number(v))} type="number" />
        <StatInput label="FNP" value={fnp} onChange={setFnp} type="text" placeholder="-" />
      </div>
      <StatInput label="Keywords" value={keywords} onChange={setKeywords} type="text" placeholder="Infantry, Vehicle..." />

      <button
        onClick={handleApply}
        style={{
          background: 'var(--accent-green-d)',
          border: '1px solid var(--accent-green)',
          color: 'var(--accent-green-l)',
          padding: '6px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Set Target
      </button>
    </div>
  );
}

function StatInput({ label, value, onChange, type, suffix, placeholder }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type: 'text' | 'number';
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            width: '100%',
          }}
        />
        {suffix && <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>{suffix}</span>}
      </div>
    </div>
  );
}
