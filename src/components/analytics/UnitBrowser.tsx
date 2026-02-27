/** Search Wahapedia units by name across all factions for target selection */

import { useState, useMemo } from 'react';
import { useCalcStore } from '../../state/calc-store.ts';
import { getLoadedData } from '../../data/index.ts';
import { normalizeName } from '../../parser/normalize.ts';
import type { WahapediaDatasheet } from '../../types/wahapedia.ts';

export function UnitBrowser() {
  const setDefenderFromWahapedia = useCalcStore(s => s.setDefenderFromWahapedia);
  const [search, setSearch] = useState('');

  let data: ReturnType<typeof getLoadedData> | null = null;
  try {
    data = getLoadedData();
  } catch {
    return <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Wahapedia data not loaded</div>;
  }

  const filteredDatasheets = useMemo(() => {
    if (!data || search.length < 2) return [];
    const normalized = normalizeName(search);
    return (Object.values(data.datasheets) as WahapediaDatasheet[])
      .filter(ds => normalizeName(ds.name).includes(normalized))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [data, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by unit name..."
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
        }}
      />

      {/* Results */}
      {search.length >= 2 && (
        <div style={{
          maxHeight: 200,
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          {filteredDatasheets.length === 0 ? (
            <div style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
              No matches
            </div>
          ) : (
            filteredDatasheets.map(ds => (
              <button
                key={ds.id}
                onClick={() => {
                  setDefenderFromWahapedia(ds.id, ds.faction_id);
                  setSearch('');
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-head)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{ds.name}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: 8 }}>
                  {data!.factions[ds.faction_id]?.name ?? ds.faction_id}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
