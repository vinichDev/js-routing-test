import { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import StatusBar from './components/StatusBar';
import MetricsChart from './components/MetricsChart';
import MetricsTable from './components/MetricsTable';
import LogViewer from './components/LogViewer';
import { getSutList, getSutStatus, getMetricsSummary, cancelAction, stopSut } from './api';

export default function App() {
  const [suts, setSuts] = useState([]);
  const [activeSut, setActiveSut] = useState(null);
  const [summary, setSummary] = useState([]);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [actionLabel, setActionLabel] = useState(null);

  useEffect(() => {
    getSutList().then(r => setSuts(r.data.suts));
    getSutStatus().then(r => setActiveSut(r.data.active));
    getMetricsSummary().then(r => setSummary(r.data.summary));
  }, []);

  const appendLog = (line) => setLogs(prev => [...prev.slice(-200), line]);

  const onDone = () => {
    setRunning(false);
    setActionLabel(null);
    getMetricsSummary().then(r => setSummary(r.data.summary));
    getSutStatus().then(r => setActiveSut(r.data.active));
  };

  const handleStopSut = async () => {
    await stopSut();
    getSutStatus().then(r => setActiveSut(r.data.active));
  };

  const handleCancelAction = async () => {
    await cancelAction();
    setRunning(false);
    setActionLabel(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4">
        <h1 className="text-xl font-medium">JS Router Benchmark Dashboard</h1>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        <StatusBar
          activeSut={activeSut}
          running={running}
          actionLabel={actionLabel}
          onStopSut={handleStopSut}
          onCancelAction={handleCancelAction}
        />

        <ControlPanel
          suts={suts}
          running={running}
          setRunning={setRunning}
          setActionLabel={setActionLabel}
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
