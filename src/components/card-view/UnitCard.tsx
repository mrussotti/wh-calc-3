import type { EnrichedUnit } from '../../types/enriched.ts';
import { RoleBadge } from '../shared/RoleBadge.tsx';
import { StatBar } from './StatBar.tsx';
import { WeaponsTable } from './WeaponsTable.tsx';
import { AbilityChips } from './AbilityChips.tsx';
import { KeywordsRow } from './KeywordsRow.tsx';
import { LeaderSection } from './LeaderSection.tsx';
import { TransportSection } from './TransportSection.tsx';

export function UnitCard({ unit }: { unit: EnrichedUnit }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      {/* Card header */}
      <div style={{
        background: 'var(--bg-card-head)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-head)',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--text-bright)',
            }}>
              {unit.displayName}
            </span>
            {unit.isWarlord && (
              <span title="Warlord" style={{ fontSize: '0.9rem' }}>&#9813;</span>
            )}
            <RoleBadge role={unit.role} />
          </div>
          {unit.enhancement && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--role-char)',
              marginTop: 2,
            }}>
              {unit.enhancement.name}
            </div>
          )}
        </div>
        <span style={{
          fontWeight: 600,
          color: 'var(--accent-gold)',
          fontSize: '0.95rem',
        }}>
          {unit.points} pts
        </span>
      </div>

      {/* Stats */}
      <StatBar stats={unit.modelStats} />

      {/* Weapons */}
      <WeaponsTable weapons={unit.weapons} />

      {/* Abilities */}
      <AbilityChips abilities={unit.abilities} />

      {/* Keywords */}
      <KeywordsRow keywords={unit.keywords} factionKeywords={unit.factionKeywords} />

      {/* Equipment */}
      {unit.equipment.length > 0 && (
        <div style={{
          padding: '4px 12px 6px',
          fontSize: '0.78rem',
          color: 'var(--text-dim)',
        }}>
          Equipment: {unit.equipment.join(', ')}
        </div>
      )}

      {/* Leader pairing */}
      <LeaderSection unit={unit} />

      {/* Transport */}
      <TransportSection unit={unit} />

      {/* Warnings */}
      {unit.matchWarnings.length > 0 && (
        <div style={{
          padding: '4px 12px 6px',
          fontSize: '0.72rem',
          color: 'var(--accent-red)',
          opacity: 0.8,
        }}>
          {unit.matchWarnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}
    </div>
  );
}
