import { useArmyStore } from '../../state/army-store.ts';
import type { ViewMode } from '../../types/state.ts';

export function AppHeader() {
  const armyList = useArmyStore(s => s.armyList);
  const viewMode = useArmyStore(s => s.viewMode);
  const setViewMode = useArmyStore(s => s.setViewMode);
  const reset = useArmyStore(s => s.reset);

  if (!armyList) return null;

  return (
    <header style={{
      background: 'linear-gradient(135deg, #1a1d22 0%, #22262d 100%)',
      borderBottom: '3px solid var(--accent-green)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{
        width: 44, height: 44,
        background: 'var(--accent-green-d)',
        border: '2px solid var(--accent-green)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 'bold',
        color: 'var(--accent-green-l)',
        fontFamily: 'var(--font-head)',
        flexShrink: 0,
      }}>
        {armyList.factionName.charAt(0)}
      </div>

      <div style={{ flex: 1 }}>
        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: '1.35rem',
          color: 'var(--text-bright)',
          letterSpacing: '0.5px',
        }}>
          {armyList.armyName}
        </h1>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 2 }}>
          <span>{armyList.factionName}</span>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
          <span>{armyList.detachment?.name ?? 'No Detachment'}</span>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
          <span>{armyList.gameSize}</span>
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-head)',
        fontSize: '1.3rem',
        color: 'var(--accent-gold)',
        fontWeight: 'bold',
      }}>
        {armyList.totalPoints} pts
      </div>

      <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
        <ViewToggle mode="card" current={viewMode} onClick={setViewMode} label="Cards" />
        <ViewToggle mode="table" current={viewMode} onClick={setViewMode} label="Table" />
      </div>

      <button
        onClick={reset}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-dim)',
          padding: '5px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          marginLeft: 8,
        }}
      >
        New Import
      </button>
    </header>
  );
}

function ViewToggle({ mode, current, onClick, label }: {
  mode: ViewMode; current: ViewMode; onClick: (m: ViewMode) => void; label: string;
}) {
  const active = mode === current;
  return (
    <button
      onClick={() => onClick(mode)}
      style={{
        background: active ? 'var(--accent-green-d)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-green)' : 'var(--border)'}`,
        color: active ? 'var(--accent-green-l)' : 'var(--text-dim)',
        padding: '4px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}
