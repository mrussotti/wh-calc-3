/** Analytics mode container with design picker */

import { useState } from 'react';
import { DamageCalc } from './DamageCalc.tsx';
import { DamageCalcCompact } from './DamageCalcCompact.tsx';

type DesignVariant = 'cards' | 'compact';

const designs: { id: DesignVariant; label: string; desc: string }[] = [
  { id: 'cards', label: 'Cards', desc: 'Bordered panels, two-column layout' },
  { id: 'compact', label: 'Compact', desc: 'Dense flat tool, no chrome, spreadsheet-like' },
];

export function AnalyticsShell() {
  const [design, setDesign] = useState<DesignVariant>('cards');

  return (
    <div style={{
      padding: '16px 24px',
      maxWidth: 1400,
      margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-bright)',
          fontFamily: 'var(--font-head)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Damage Calculator
        </div>

        {/* Design picker */}
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {designs.map(d => (
            <button
              key={d.id}
              onClick={() => setDesign(d.id)}
              title={d.desc}
              style={{
                background: design === d.id ? 'var(--accent-green)' : 'transparent',
                border: `1px solid ${design === d.id ? 'var(--accent-green)' : 'var(--border)'}`,
                color: design === d.id ? '#fff' : 'var(--text-dim)',
                padding: '4px 10px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontWeight: design === d.id ? 600 : 400,
                borderRadius: 3,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {design === 'cards' && <DamageCalc />}
      {design === 'compact' && <DamageCalcCompact />}
    </div>
  );
}
