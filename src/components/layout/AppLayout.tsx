import type { ReactNode } from 'react';

export function AppLayout({ children, sidebar }: { children: ReactNode; sidebar: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
    }}>
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: 20,
      }}>
        {children}
      </main>
      <aside style={{
        width: 300,
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
        overflow: 'auto',
        padding: 16,
        flexShrink: 0,
      }}>
        {sidebar}
      </aside>
    </div>
  );
}
