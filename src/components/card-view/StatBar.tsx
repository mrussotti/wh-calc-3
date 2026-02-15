import type { ModelStats } from '../../types/enriched.ts';

const STAT_LABELS = ['M', 'T', 'Sv', 'W', 'Ld', 'OC'] as const;

export function StatBar({ stats }: { stats: ModelStats[] }) {
  if (stats.length === 0) return null;

  return (
    <div style={{ padding: '8px 12px' }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 2,
          marginBottom: i < stats.length - 1 ? 4 : 0,
        }}>
          {stats.length > 1 && (
            <span style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              minWidth: 80,
              alignSelf: 'center',
            }}>
              {s.name}
            </span>
          )}
          {STAT_LABELS.map(label => (
            <StatCell key={label} label={label} value={getStatValue(s, label)} />
          ))}
          {s.invSv !== '-' && (
            <StatCell label="Inv" value={s.invSv} highlight />
          )}
        </div>
      ))}
    </div>
  );
}

function getStatValue(s: ModelStats, label: string): string {
  switch (label) {
    case 'M': return s.M;
    case 'T': return s.T;
    case 'Sv': return s.Sv;
    case 'W': return s.W;
    case 'Ld': return s.Ld;
    case 'OC': return s.OC;
    default: return '-';
  }
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-stat)',
      borderRadius: 'var(--radius-sm)',
      padding: '3px 0',
      textAlign: 'center',
      minWidth: 38,
      flex: 1,
    }}>
      <div style={{
        fontSize: '0.65rem',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>{label}</div>
      <div style={{
        fontSize: '0.88rem',
        fontWeight: 600,
        color: highlight ? 'var(--accent-gold)' : 'var(--text-bright)',
      }}>{value}</div>
    </div>
  );
}
