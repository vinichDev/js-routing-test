export default function LogViewer({ logs }) {
  if (logs.length === 0) return null;
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-sm font-medium text-gray-400 mb-2">Лог выполнения</h2>
      <div className="h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
        {logs.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );
}
