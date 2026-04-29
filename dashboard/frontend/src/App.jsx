import { useState, useEffect, useCallback, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import StatusBar from './components/StatusBar';
import MetricsChart from './components/MetricsChart';
import MetricsTable from './components/MetricsTable';
import LogViewer from './components/LogViewer';
import { getSutList, getSutStatus, getMetricsSummary, getActionStatus, cancelAction, stopSut } from './api';

export default function App() {
  const [suts, setSuts] = useState([]);
  const [activeSut, setActiveSut] = useState(null);
  const [summary, setSummary] = useState([]);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [actionLabel, setActionLabel] = useState(null);
  const [stoppingSut, setStoppingSut] = useState(false);
  const sseActiveRef = useRef(false);

  useEffect(() => {
    getSutList().then(r => setSuts(r.data.suts));
    getSutStatus().then(r => setActiveSut(r.data.active));
    getMetricsSummary().then(r => setSummary(r.data.summary));
    getActionStatus().then(r => {
      if (r.data.running) {
        setRunning(true);
        setActionLabel(r.data.label);
      }
    });
  }, []);

  const appendLog = (line) => setLogs(prev => [...prev.slice(-200), line]);

  const onDone = useCallback(() => {
    sseActiveRef.current = false;
    setRunning(false);
    setActionLabel(null);
    getMetricsSummary().then(r => setSummary(r.data.summary));
    getSutStatus().then(r => setActiveSut(r.data.active));
  }, []);

  // Polling активен пока running=true, но пропускает итерации когда SSE работает.
  // Нужен только после перезагрузки страницы — когда SSE-соединение уже потеряно.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (sseActiveRef.current) return;
      getActionStatus().then(r => { if (!r.data.running) onDone(); });
    }, 3000);
    return () => clearInterval(id);
  }, [running, onDone]);

  const handleStopSut = async () => {
    setStoppingSut(true);
    await stopSut();
    getSutStatus().then(r => {
      setActiveSut(r.data.active);
      setStoppingSut(false);
    });
  };

  const handleCancelAction = async () => {
    sseActiveRef.current = false;
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
          stoppingSut={stoppingSut}
          running={running}
          actionLabel={actionLabel}
          onStopSut={handleStopSut}
          onCancelAction={handleCancelAction}
        />

        <ControlPanel
          suts={suts}
          setRunning={setRunning}
          setActionLabel={setActionLabel}
          onSseStart={() => { sseActiveRef.current = true; }}
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
