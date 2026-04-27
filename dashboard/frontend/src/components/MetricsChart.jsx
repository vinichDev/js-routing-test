import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/** sut_id использует underscores (next_app) — убираем _app и переименовываем составные */
const shortName = s => s
  .replace('_app', '')
  .replace('react_router', 'RR v7')
  .replace('astro_vt', 'astro+VT')
  .replace('next_pages', 'next/pages');

export default function MetricsChart({ data }) {
  const chartData = [...data]
    .sort((a, b) => (a.fcp_mean ?? 9999) - (b.fcp_mean ?? 9999))
    .map(d => ({
      name: shortName(d.sut_id),
      FCP: d.fcp_mean != null ? +d.fcp_mean.toFixed(0) : null,
      LCP: d.lcp_mean != null ? +d.lcp_mean.toFixed(0) : null,
      NAV: d.nav_mean != null ? +d.nav_mean.toFixed(0) : null,
      REGEN: d.regen_mean != null ? +d.regen_mean.toFixed(0) : null,
    }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-medium text-gray-800 mb-4">Initial Load: FCP и LCP</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={60} />
            <YAxis unit="ms" tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => `${v} ms`} />
            <Legend />
            <Bar dataKey="FCP" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="LCP" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-medium text-gray-800 mb-4">Navigation и Regeneration</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={60} />
            <YAxis unit="ms" tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => `${v} ms`} />
            <Legend />
            <Bar dataKey="NAV" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="REGEN" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
