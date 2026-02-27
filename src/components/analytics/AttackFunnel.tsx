/** Visual attack funnel bar chart */

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface AttackFunnelProps {
  attacks: number;
  hits: number;
  wounds: number;
  unsaved: number;
  damage: number;
  kills: number;
}

export function AttackFunnel({ attacks, hits, wounds, unsaved, damage, kills }: AttackFunnelProps) {
  const maxValue = Math.max(attacks, damage, 1);

  const steps: FunnelStep[] = [
    { label: 'Attacks', value: attacks, color: 'var(--accent-green)' },
    { label: 'Hits', value: hits, color: 'var(--funnel-hit)' },
    { label: 'Wounds', value: wounds, color: 'var(--funnel-wound)' },
    { label: 'Unsaved', value: unsaved, color: 'var(--funnel-save)' },
    { label: 'Damage', value: damage, color: 'var(--funnel-dmg)' },
    { label: 'Kills', value: kills, color: 'var(--funnel-kill)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map(step => (
        <FunnelBar key={step.label} step={step} maxValue={maxValue} />
      ))}
    </div>
  );
}

function FunnelBar({ step, maxValue }: { step: FunnelStep; maxValue: number }) {
  const pct = maxValue > 0 ? (step.value / maxValue) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        width: 55,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {step.label}
      </span>
      <div style={{
        flex: 1,
        background: 'var(--funnel-empty)',
        borderRadius: 3,
        height: 20,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: step.color,
          borderRadius: 3,
          transition: 'width 0.3s ease',
          minWidth: step.value > 0 ? 2 : 0,
        }} />
      </div>
      <span style={{
        fontSize: '0.82rem',
        color: 'var(--text-bright)',
        width: 48,
        textAlign: 'right',
        fontWeight: 500,
        flexShrink: 0,
      }}>
        {step.value.toFixed(1)}
      </span>
    </div>
  );
}
