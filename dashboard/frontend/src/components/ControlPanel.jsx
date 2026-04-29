import { useState, useRef, useEffect } from 'react';
import { switchSut, runTest, runAll, cancelAction } from '../api';

const COOLDOWN_S = 3;

export default function ControlPanel({ suts, setRunning, setActionLabel, onSseStart, appendLog, setLogs, onDone }) {
  const [selected, setSelected] = useState('next-app');
  const [modes, setModes] = useState('cold,warm');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const abortRef = useRef(null);  // AbortController текущего SSE-потока
  const timerRef = useRef(null);  // таймер обратного отсчёта

  /** Запустить блокировку кнопок на COOLDOWN_S секунд */
  const startCooldown = () => {
    setCooldown(true);
    setCooldownLeft(COOLDOWN_S);
    let left = COOLDOWN_S;
    timerRef.current = setInterval(() => {
      left -= 1;
      setCooldownLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current);
        setCooldown(false);
      }
    }, 1000);
  };

  /** Отменить текущее действие: оборвать SSE + убить процесс на бэкенде */
  const cancel = async () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    await cancelAction();
  };

  /** Запустить действие: отменить предыдущее, очистить лог, включить cooldown */
  const start = async (fn, label) => {
    await cancel();
    setLogs([]);
    setRunning(true);
    setActionLabel(label);
    onSseStart();
    startCooldown();
    abortRef.current = fn();
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const isBlocked = cooldown;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-800 mb-4">Управление</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-500 mb-1">SUT</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            disabled={isBlocked}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {suts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Режимы</label>
          <select
            value={modes}
            onChange={e => setModes(e.target.value)}
            disabled={isBlocked}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="cold,warm">cold + warm</option>
            <option value="cold">только cold</option>
            <option value="warm">только warm</option>
          </select>
        </div>

        <button
          onClick={() => start(() => switchSut(selected, appendLog, onDone), `Переключение SUT: ${selected}`)}
          disabled={isBlocked}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Переключить SUT
        </button>

        <button
          onClick={() => start(() => runTest(selected, modes, appendLog, onDone), `Тест: ${selected} [${modes}]`)}
          disabled={isBlocked}
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          Запустить тест
        </button>

        <button
          onClick={() => start(() => runAll(appendLog, onDone), 'Все тесты')}
          disabled={isBlocked}
          className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
        >
          Запустить все тесты
        </button>

        {cooldown && (
          <span className="text-sm text-gray-400">
            Новое действие через {cooldownLeft} сек...
          </span>
        )}
      </div>
    </div>
  );
}
