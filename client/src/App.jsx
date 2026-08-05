import { useState } from 'react';
import TypeToggle from './components/TypeToggle';
import BroadcastTable from './components/BroadcastTable';
import useBroadcasts from './hooks/useBroadcasts';

function App() {
  const [type, setType] = useState('live');
  const { data, loading, error } = useBroadcasts(type);

  return (
    <div className="app">
      <TypeToggle value={type} onChange={setType} />
      <BroadcastTable data={data} loading={loading} error={error} type={type} />
    </div>
  );
}

export default App;
