import type { UnitRole } from '../../types/army-list.ts';

const ROLE_LABELS: Record<UnitRole, string> = {
  characters: 'Character',
  battleline: 'Battleline',
  dedicated_transports: 'Transport',
  other: 'Other',
};

const ROLE_COLORS: Record<UnitRole, string> = {
  characters: 'var(--role-char)',
  battleline: 'var(--role-battle)',
  dedicated_transports: 'var(--role-trans)',
  other: 'var(--role-other)',
};

export function RoleBadge({ role }: { role: UnitRole }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: '3px',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#fff',
      background: ROLE_COLORS[role],
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {ROLE_LABELS[role]}
    </span>
  );
}
