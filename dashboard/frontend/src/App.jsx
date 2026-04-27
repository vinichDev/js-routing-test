import { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import MetricsChart from './components/MetricsChart';
import MetricsTable from './components/MetricsTable';
import LogViewer from './components/LogViewer';
import { getSutList, getSutStatus, getMetricsSummary } from './api';

export default function App() {
  const [suts, setSuts] = useState([]);
  const [activeSut, setActiveSut] = useState(null);
  const [summary, setSummary] = useState([]);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getSutList().then(r => setSuts(r.data.suts));
    getSutStatus().then(r => setActiveSut(r.data.active));
    getMetricsSummary().then(r => setSummary(r.data.summary));
  }, []);

  const appendLog = (line) => setLogs(prev => [...prev.slice(-200), line]);

  const onDone = () => {
    setRunning(false);
    getMetricsSummary().then(r => setSummary(r.data.summary));
    getSutStatus().then(r => setActiveSut(r.data.active));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4">
        <h1 className="text-xl font-medium">JS Router Benchmark Dashboard</h1>
        {activeSut && (
          <p className="text-indigo-200 text-sm mt-1">Активный SUT: {activeSut}</p>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        <ControlPanel
          suts={suts}
          activeSut={activeSut}
          running={running}
          setRunning={setRunning}
          appendLog={appendLog}
          setLogs={setLogs}
          onDone={onDone}
        />

        <LogViewer logs={logs} />

        {summary.length > 0 ? (
          <>
            <MetricsChart data={summary} />
            <MetricsTable data={summary} />
          </>
        ) : (
          <div className="text-center text-gray-400 py-16">
            Нет данных. Запустите тест чтобы увидеть метрики.
          </div>
        )}
      </main>
    </div>
  );
}
