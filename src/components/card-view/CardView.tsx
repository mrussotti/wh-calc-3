import { useArmyStore } from '../../state/army-store.ts';
import { UnitCard } from './UnitCard.tsx';
import type { UnitRole } from '../../types/army-list.ts';
import type { EnrichedUnit } from '../../types/enriched.ts';

const ROLE_ORDER: UnitRole[] = ['characters', 'battleline', 'dedicated_transports', 'other'];
const ROLE_TITLES: Record<UnitRole, string> = {
  characters: 'Characters',
  battleline: 'Battleline',
  dedicated_transports: 'Dedicated Transports',
  other: 'Other Datasheets',
};

export function CardView() {
  const armyList = useArmyStore(s => s.armyList);
  if (!armyList) return null;

  // Group units by role
  const grouped = new Map<UnitRole, EnrichedUnit[]>();
  for (const role of ROLE_ORDER) {
    const units = armyList.units.filter(u => u.role === role);
    if (units.length > 0) grouped.set(role, units);
  }

  return (
    <div>
      {ROLE_ORDER.map(role => {
        const units = grouped.get(role);
        if (!units) return null;
        return (
          <div key={role} style={{ marginBottom: 24 }}>
            <h2 style={{
              fontFamily: 'var(--font-head)',
              fontSize: '1.1rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 10,
              paddingBottom: 4,
              borderBottom: '1px solid var(--border)',
            }}>
              {ROLE_TITLES[role]}
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 400,
                marginLeft: 8,
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-main)',
              }}>
                ({units.length})
              </span>
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: 12,
            }}>
              {units.map(unit => (
                <UnitCard key={unit.instanceId} unit={unit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
