export function KeywordsRow({ keywords, factionKeywords }: { keywords: string[]; factionKeywords: string[] }) {
  if (keywords.length === 0 && factionKeywords.length === 0) return null;

  return (
    <div style={{
      padding: '4px 12px 8px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      fontSize: '0.7rem',
    }}>
      {factionKeywords.map((kw, i) => (
        <span key={`f-${i}`} style={{
          padding: '1px 6px',
          borderRadius: 2,
          background: 'rgba(201,168,76,0.12)',
          color: 'var(--accent-gold)',
          border: '1px solid rgba(201,168,76,0.25)',
        }}>
          {kw}
        </span>
      ))}
      {keywords.map((kw, i) => (
        <span key={`k-${i}`} style={{
          padding: '1px 6px',
          borderRadius: 2,
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--text-dim)',
          border: '1px solid var(--border)',
        }}>
          {kw}
        </span>
      ))}
    </div>
  );
}
