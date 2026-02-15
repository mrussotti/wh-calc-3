import type { EnrichedWeapon } from '../../types/enriched.ts';

const COLS = ['Weapon', 'Range', 'A', 'BS/WS', 'S', 'AP', 'D'] as const;

export function WeaponsTable({ weapons }: { weapons: EnrichedWeapon[] }) {
  if (weapons.length === 0) return null;

  // Group by type: ranged then melee
  const ranged = weapons.filter(w => w.type === 'Ranged');
  const melee = weapons.filter(w => w.type === 'Melee' || w.type === '-');
  const other = weapons.filter(w => w.type !== 'Ranged' && w.type !== 'Melee' && w.type !== '-');

  return (
    <div style={{ padding: '4px 12px 8px' }}>
      {ranged.length > 0 && <WeaponSection label="Ranged Weapons" weapons={ranged} />}
      {melee.length > 0 && <WeaponSection label="Melee Weapons" weapons={melee} />}
      {other.length > 0 && <WeaponSection label="Other Weapons" weapons={other} />}
    </div>
  );
}

function WeaponSection({ label, weapons }: { label: string; weapons: EnrichedWeapon[] }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 2,
        paddingTop: 4,
      }}>{label}</div>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.8rem',
      }}>
        <thead>
          <tr>
            {COLS.map(col => (
              <th key={col} style={{
                textAlign: col === 'Weapon' ? 'left' : 'center',
                padding: '2px 4px',
                color: 'var(--text-dim)',
                fontWeight: 500,
                fontSize: '0.72rem',
                borderBottom: '1px solid var(--border)',
              }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weapons.map((w, i) => {
            const displayName = w.profileName
              ? `${w.name} - ${w.profileName}`
              : w.name;
            const prefix = w.count > 1 ? `${w.count}x ` : '';
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '3px 4px', color: 'var(--text-bright)' }}>
                  {prefix}{displayName}
                  {w.keywords && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 6 }}>
                      [{w.keywords}]
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '3px 4px' }}>{w.range}</td>
                <td style={{ textAlign: 'center', padding: '3px 4px' }}>{w.A}</td>
                <td style={{ textAlign: 'center', padding: '3px 4px' }}>{w.BS_WS}</td>
                <td style={{ textAlign: 'center', padding: '3px 4px' }}>{w.S}</td>
                <td style={{ textAlign: 'center', padding: '3px 4px' }}>{w.AP}</td>
                <td style={{ textAlign: 'center', padding: '3px 4px' }}>{w.D}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
