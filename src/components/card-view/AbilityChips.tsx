import type { UnitAbility } from '../../types/enriched.ts';

const TYPE_COLORS: Record<UnitAbility['type'], string> = {
  core: '#6b7280',
  faction: '#c9a84c',
  datasheet: '#3a7d44',
  enhancement: '#b07ccf',
  invulnerable: '#c9a84c',
  other: '#6b7280',
};

export function AbilityChips({ abilities }: { abilities: UnitAbility[] }) {
  if (abilities.length === 0) return null;

  return (
    <div style={{
      padding: '4px 12px 6px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
    }}>
      {abilities.map((ab, i) => (
        <span
          key={i}
          title={ab.description}
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 3,
            fontSize: '0.72rem',
            fontWeight: 500,
            background: TYPE_COLORS[ab.type] + '25',
            color: TYPE_COLORS[ab.type],
            border: `1px solid ${TYPE_COLORS[ab.type]}40`,
            cursor: ab.description ? 'help' : 'default',
          }}
        >
          {ab.name}
        </span>
      ))}
    </div>
  );
}
