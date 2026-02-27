/** Shooting / Fighting / Full Sequence phase toggle */

import type { PhaseMode } from '../../calc/multi-attack.ts';

interface PhaseToggleProps {
  mode: PhaseMode;
  onChange: (mode: PhaseMode) => void;
}

const options: { value: PhaseMode; label: string }[] = [
  { value: 'shooting', label: 'Shoot' },
  { value: 'fighting', label: 'Fight' },
  { value: 'full_sequence', label: 'Full Sequence' },
];

export function PhaseToggle({ mode, onChange }: PhaseToggleProps) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(opt => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
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
            {active ? '\u25C9 ' : '\u25CB '}{opt.label}
          </button>
        );
      })}
    </div>
  );
}
