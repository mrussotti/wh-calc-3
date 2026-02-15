import { useArmyStore } from './state/army-store.ts';
import { AppHeader } from './components/layout/AppHeader.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { ImportPanel } from './components/import/ImportPanel.tsx';
import { CardView } from './components/card-view/CardView.tsx';
import { TableView } from './components/table-view/TableView.tsx';

function App() {
  const armyList = useArmyStore(s => s.armyList);
  const viewMode = useArmyStore(s => s.viewMode);

  if (!armyList) {
    return <ImportPanel />;
  }

  return (
    <>
      <AppHeader />
      <AppLayout
        sidebar={<Sidebar />}
      >
        {viewMode === 'card' ? <CardView /> : <TableView />}
      </AppLayout>
    </>
  );
}

export default App;
