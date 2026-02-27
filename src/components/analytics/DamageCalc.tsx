/** Main damage calculator layout — attackers + defender + results */

import { useCalcStore } from '../../state/calc-store.ts';
import { AttackerPanel } from './AttackerPanel.tsx';
import { DefenderPanel } from './DefenderPanel.tsx';
import { ResultsPanel } from './ResultsPanel.tsx';

export function DamageCalc() {
  const hasResult = useCalcStore(s => s.lastResult !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top row: Attackers + Defender */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        alignItems: 'start',
      }}>
        <AttackerPanel />
        <DefenderPanel />
      </div>

      {/* Bottom: Results */}
      {hasResult && <ResultsPanel />}
    </div>
  );
}
