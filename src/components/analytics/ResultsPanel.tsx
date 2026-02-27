/** Results panel — attack funnel + per-unit breakdown + summary */

import { useCalcStore } from '../../state/calc-store.ts';
import { AttackFunnel } from './AttackFunnel.tsx';

export function ResultsPanel() {
  const lastResult = useCalcStore(s => s.lastResult);
  const defenderProfile = useCalcStore(s => s.defenderProfile);

  if (!lastResult || !defenderProfile) return null;

  // Aggregate totals across all units
  const totalAttacks = lastResult.unitResults.reduce(
    (sum, ur) => sum + ur.weapons.reduce((ws, w) => ws + w.totalAttacks, 0), 0,
  );
  const totalHits = lastResult.unitResults.reduce(
    (sum, ur) => sum + ur.weapons.reduce((ws, w) => ws + w.hits, 0), 0,
  );
  const totalWounds = lastResult.unitResults.reduce(
    (sum, ur) => sum + ur.weapons.reduce((ws, w) => ws + w.wounds, 0), 0,
  );
  const totalUnsaved = lastResult.unitResults.reduce(
    (sum, ur) => sum + ur.weapons.reduce((ws, w) => ws + w.unsavedWounds, 0), 0,
  );

  const tracker = lastResult.defenderWoundTracker;
  const hasLeaderDefense = tracker.bodyguardWoundsRemaining !== undefined;
  const remainingWounds = tracker.remainingWoundsAfterEachUnit.length > 0
    ? tracker.remainingWoundsAfterEachUnit[tracker.remainingWoundsAfterEachUnit.length - 1]
    : tracker.initialWoundPool;
  const remainingModels = tracker.modelsRemainingAfterEachUnit.length > 0
    ? tracker.modelsRemainingAfterEachUnit[tracker.modelsRemainingAfterEachUnit.length - 1]
    : defenderProfile.modelCount;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 16,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <h3 style={{
          fontFamily: 'var(--font-head)',
          fontSize: '1.1rem',
          color: 'var(--text-bright)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Results
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          vs {defenderProfile.name}
        </span>
      </div>

      {/* Attack Funnel */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>
          ATTACK FUNNEL
        </div>
        <AttackFunnel
          attacks={totalAttacks}
          hits={totalHits}
          wounds={totalWounds}
          unsaved={totalUnsaved}
          damage={lastResult.totalDamage}
          kills={lastResult.totalModelsKilled}
        />
      </div>

      {/* Wound Tracker */}
      {lastResult.unitResults.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>
            WOUND TRACKER
          </div>
          {hasLeaderDefense ? (
            <LeaderWoundTracker tracker={tracker} unitResults={lastResult.unitResults} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <WoundTrackerRow
                label="Start"
                wounds={tracker.initialWoundPool}
                models={defenderProfile.modelCount}
                maxWounds={tracker.initialWoundPool}
              />
              {lastResult.unitResults.map((ur, i) => (
                <WoundTrackerRow
                  key={ur.unitInstanceId}
                  label={`After ${ur.unitName}`}
                  wounds={tracker.remainingWoundsAfterEachUnit[i]}
                  models={tracker.modelsRemainingAfterEachUnit[i]}
                  maxWounds={tracker.initialWoundPool}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-unit breakdown table */}
      {lastResult.unitResults.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>
            PER-UNIT BREAKDOWN
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.78rem',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Unit</th>
                <th style={thStyle}>Phase</th>
                <th style={thStyle}>Atk</th>
                <th style={thStyle}>Hit</th>
                <th style={thStyle}>Wnd</th>
                <th style={thStyle}>Dmg</th>
                <th style={thStyle}>Kills</th>
              </tr>
            </thead>
            <tbody>
              {lastResult.unitResults.map((ur, i) => (
                <tr key={ur.unitInstanceId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--text-bright)' }}>{ur.unitName}</td>
                  <td style={tdStyle}>{ur.phase === 'shooting' ? 'Shoot' : 'Fight'}</td>
                  <td style={tdStyle}>{ur.weapons.reduce((s, w) => s + w.totalAttacks, 0).toFixed(1)}</td>
                  <td style={tdStyle}>{ur.weapons.reduce((s, w) => s + w.hits, 0).toFixed(1)}</td>
                  <td style={tdStyle}>{ur.weapons.reduce((s, w) => s + w.wounds, 0).toFixed(1)}</td>
                  <td style={tdStyle}>{ur.totalDamageAfterFnp.toFixed(1)}</td>
                  <td style={tdStyle}>{ur.totalModelsKilled.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Kills </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 600 }}>
            {lastResult.totalModelsKilled.toFixed(1)}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            /{defenderProfile.modelCount}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Damage </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 600 }}>
            {lastResult.totalDamage.toFixed(1)}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Remaining </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 600 }}>
            ~{remainingModels}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            {' '}models ({remainingWounds.toFixed(1)}W)
          </span>
        </div>
        {hasLeaderDefense && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Bodyguard: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{tracker.bodyguardWoundsRemaining!.toFixed(1)}W</span>
            {' | '}
            Leader: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{tracker.leaderWoundsRemaining!.toFixed(1)}W</span>
          </div>
        )}
        {lastResult.defenderWipedOut && (
          <span style={{
            background: 'rgba(168, 50, 50, 0.2)',
            border: '1px solid var(--accent-red)',
            color: 'var(--accent-red)',
            padding: '2px 10px',
            borderRadius: 12,
            fontSize: '0.78rem',
            fontWeight: 600,
          }}>
            WIPED OUT
          </span>
        )}
      </div>
    </div>
  );
}

function LeaderWoundTracker({ tracker, unitResults }: {
  tracker: import('../../calc/types.ts').SequentialAttackResult['defenderWoundTracker'];
  unitResults: import('../../calc/types.ts').UnitAttackResult[];
}) {
  const bgArr = tracker.bodyguardRemainingAfterEachUnit ?? [];
  const ldrArr = tracker.leaderRemainingAfterEachUnit ?? [];
  const initialBg = tracker.initialBodyguardWounds ?? tracker.initialWoundPool;
  const initialLdr = tracker.initialLeaderWounds ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 120, flexShrink: 0 }}>Start</span>
        <SplitWoundBar
          bodyguard={initialBg}
          leader={initialLdr}
          max={tracker.initialWoundPool}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text)', width: 80, textAlign: 'right', flexShrink: 0 }}>
          {tracker.initialWoundPool.toFixed(1)}W
        </span>
      </div>
      {unitResults.map((ur, i) => (
        <div key={ur.unitInstanceId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 120, flexShrink: 0 }}>
            After {ur.unitName}
          </span>
          <SplitWoundBar
            bodyguard={bgArr[i] ?? 0}
            leader={ldrArr[i] ?? 0}
            max={tracker.initialWoundPool}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text)', width: 80, textAlign: 'right', flexShrink: 0 }}>
            {((bgArr[i] ?? 0) + (ldrArr[i] ?? 0)).toFixed(1)}W
          </span>
        </div>
      ))}
    </div>
  );
}

function SplitWoundBar({ bodyguard, leader, max }: {
  bodyguard: number;
  leader: number;
  max: number;
}) {
  const bgPct = max > 0 ? (bodyguard / max) * 100 : 0;
  const ldrPct = max > 0 ? (leader / max) * 100 : 0;

  return (
    <div style={{
      flex: 1,
      background: 'var(--funnel-empty)',
      borderRadius: 3,
      height: 14,
      overflow: 'hidden',
      display: 'flex',
    }}>
      <div
        title={`Bodyguard: ${bodyguard.toFixed(1)}W`}
        style={{
          width: `${bgPct}%`,
          height: '100%',
          background: bgPct > 0 ? 'var(--accent-green)' : 'transparent',
          transition: 'width 0.3s ease',
          minWidth: bodyguard > 0 ? 2 : 0,
        }}
      />
      <div
        title={`Leader: ${leader.toFixed(1)}W`}
        style={{
          width: `${ldrPct}%`,
          height: '100%',
          background: ldrPct > 0 ? 'var(--accent-gold)' : 'transparent',
          transition: 'width 0.3s ease',
          minWidth: leader > 0 ? 2 : 0,
        }}
      />
    </div>
  );
}

function WoundTrackerRow({ label, wounds, models, maxWounds }: {
  label: string;
  wounds: number;
  models: number;
  maxWounds: number;
}) {
  const pct = maxWounds > 0 ? (wounds / maxWounds) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 120, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        background: 'var(--funnel-empty)',
        borderRadius: 3,
        height: 14,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: pct > 50 ? 'var(--accent-green)' : pct > 20 ? 'var(--accent-gold)' : 'var(--accent-red)',
          borderRadius: 3,
          transition: 'width 0.3s ease',
          minWidth: wounds > 0 ? 2 : 0,
        }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text)', width: 80, textAlign: 'right', flexShrink: 0 }}>
        {wounds.toFixed(1)}W ({models})
      </span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '4px 8px',
  color: 'var(--text-dim)',
  fontWeight: 600,
  textAlign: 'right',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  color: 'var(--text)',
  textAlign: 'right',
};
