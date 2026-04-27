const fmt = v => v != null ? v.toFixed(0) : '—';

/** sut_id использует underscores (next_app) — убираем суффикс _app */
const shortName = s => s.replace('_app', '');

export default function MetricsTable({ data }) {
  const sorted = [...data].sort((a, b) => (a.fcp_mean ?? 9999) - (b.fcp_mean ?? 9999));
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-800 mb-4">Сравнительная таблица (по FCP)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {['SUT', 'FCP (ms)', 'LCP (ms)', 'TTFB (ms)', 'NAV (ms)', 'REGEN (ms)'].map(h => (
                <th key={h} className="px-3 py-2 border border-gray-200 font-medium text-gray-700 text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.sut_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 border border-gray-200 font-medium">{shortName(row.sut_id)}</td>
                <td className="px-3 py-2 border border-gray-200 text-right">{fmt(row.fcp_mean)}</td>
                <td className="px-3 py-2 border border-gray-200 text-right">{fmt(row.lcp_mean)}</td>
                <td className="px-3 py-2 border border-gray-200 text-right">{fmt(row.ttfb_mean)}</td>
                <td className="px-3 py-2 border border-gray-200 text-right">{fmt(row.nav_mean)}</td>
                <td className="px-3 py-2 border border-gray-200 text-right">{fmt(row.regen_mean)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
