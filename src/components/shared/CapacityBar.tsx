interface Props {
  used: number;
  total: number;
}

export function CapacityBar({ used, total }: Props) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isOver = used > total;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1,
        height: 8,
        background: 'var(--capacity-bg)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: isOver ? 'var(--accent-red)' : 'var(--accent-green)',
          borderRadius: 4,
          transition: 'width 0.2s',
        }} />
      </div>
      <span style={{
        fontSize: '0.78rem',
        color: isOver ? 'var(--accent-red)' : 'var(--text-dim)',
        fontWeight: 600,
        minWidth: 42,
        textAlign: 'right',
      }}>
        {used}/{total}
      </span>
    </div>
  );
}
