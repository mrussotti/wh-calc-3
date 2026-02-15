import { useState } from 'react';
import { useArmyStore } from '../../state/army-store.ts';

export function ImportPanel() {
  const [text, setText] = useState('');
  const importArmyList = useArmyStore(s => s.importArmyList);
  const isImporting = useArmyStore(s => s.isImporting);
  const importError = useArmyStore(s => s.importError);

  const handleImport = () => {
    if (text.trim()) {
      importArmyList(text.trim());
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: 40,
    }}>
      <div style={{
        maxWidth: 600,
        width: '100%',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: '1.8rem',
          color: 'var(--text-bright)',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Warhammer 40K Army Manager
        </h1>
        <p style={{
          color: 'var(--text-dim)',
          textAlign: 'center',
          marginBottom: 24,
          fontSize: '0.9rem',
        }}>
          Paste your army list export from the official Warhammer app below
        </p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Da Green Tide (2000 Points)\nOrks\nWar Horde\nStrike Force (2000 Points)\n\nCHARACTERS\n\nBeastboss (80 Points)\n...`}
          style={{
            width: '100%',
            minHeight: 300,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text)',
            padding: 16,
            fontSize: '0.88rem',
            fontFamily: "'Consolas', 'Courier New', monospace",
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />

        {importError && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(168,50,50,0.15)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-red)',
            fontSize: '0.85rem',
          }}>
            {importError}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={isImporting || !text.trim()}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 20px',
            background: isImporting ? 'var(--border)' : 'var(--accent-green)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '1rem',
            fontWeight: 600,
            opacity: !text.trim() ? 0.5 : 1,
          }}
        >
          {isImporting ? 'Importing...' : 'Import Army List'}
        </button>
      </div>
    </div>
  );
}
