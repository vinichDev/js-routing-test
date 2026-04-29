import express from 'express';
import cors from 'cors';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const INFRA_DIR = process.env.INFRA_DIR || '../infra';
const PORT = process.env.PORT || 4000;

/**
 * Определяет реальный путь infra/ на хосте через docker inspect.
 * Нужно чтобы передать его как INFRA_DIR в docker compose — тогда
 * переменная ${INFRA_DIR:-.} в docker-compose.yml раскроется в хостовой путь,
 * и демон сможет смонтировать bind-маунты (./data, ./logs/nginx, etc.).
 */
function resolveHostInfraDir() {
  if (process.env.HOST_INFRA_DIR) return process.env.HOST_INFRA_DIR;
  try {
    const containerId = execSync('hostname', { encoding: 'utf8' }).trim();
    const raw = execSync(`docker inspect ${containerId}`, { encoding: 'utf8' });
    const [info] = JSON.parse(raw);
    const mount = info.Mounts?.find(m => m.Destination === '/project');
    if (mount) {
      const resolved = mount.Source + '/infra';
      console.log(`HOST_INFRA_DIR resolved via docker inspect: ${resolved}`);
      return resolved;
    }
  } catch (e) {
    console.warn('Could not auto-detect HOST_INFRA_DIR:', e.message);
  }
  return null;
}

const HOST_INFRA_DIR = resolveHostInfraDir();

const SUTS = [
  'next-app', 'remix-app', 'remix3-app', 'vanilla-app', 'svelte-app',
  'react-router-app', 'next-pages-app', 'astro-app', 'tanstack-app',
  'solidstart-app', 'astro-vt-app', 'qwik-app', 'nuxt-app', 'angular-app'
];

// Текущий активный процесс — только один одновременно
let currentProcess = null;
let currentActionLabel = null;

/** Убить текущий процесс если он есть */
function killCurrent() {
  if (currentProcess) {
    try { currentProcess.kill('SIGTERM'); } catch {}
    currentProcess = null;
  }
  currentActionLabel = null;
}

/** Запустить процесс и стримить stdout/stderr через SSE */
function spawnWithSSE(res, cmd, args, cwd, label = null) {
  killCurrent();
  currentActionLabel = label;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Передаём хостовый INFRA_DIR чтобы ${INFRA_DIR:-.} в docker-compose.yml
  // раскрывался в реальный путь на хосте, а не в /project/infra.
  // BENCH_HOST нужен run-test.sh для curl-проверок — из контейнера
  // localhost не достигает портов хоста.
  const env = { ...process.env, BENCH_HOST: 'host.docker.internal' };
  if (HOST_INFRA_DIR) env.INFRA_DIR = HOST_INFRA_DIR;

  const proc = spawn(cmd, args, { cwd, env });
  currentProcess = proc;

  const send = (data) => {
    data.toString().split('\n').forEach(line => {
      if (line) res.write(`data: ${line}\n\n`);
    });
  };

  proc.stdout.on('data', send);
  proc.stderr.on('data', send);
  proc.on('close', (code) => {
    if (currentProcess === proc) { currentProcess = null; currentActionLabel = null; }
    res.write(`data: [done] exit ${code}\n\n`);
    res.end();
  });
}

// --- Эндпоинты ---

app.get('/api/sut/list', (req, res) => {
  res.json({ suts: SUTS });
});

app.get('/api/sut/status', (req, res) => {
  const proc = spawn('docker', ['ps', '--format', '{{.Names}}']);
  let output = '';
  proc.stdout.on('data', d => output += d);
  proc.on('close', () => {
    const running = SUTS.find(sut => output.includes(sut));
    res.json({ active: running || null });
  });
});

app.get('/api/action/status', (req, res) => {
  res.json({ running: !!currentProcess, label: currentActionLabel });
});

app.post('/api/action/cancel', (req, res) => {
  killCurrent();
  res.json({ ok: true });
});

app.post('/api/sut/stop', (req, res) => {
  const proc = spawn('docker', ['ps', '--format', '{{.Names}}']);
  let output = '';
  proc.stdout.on('data', d => output += d);
  proc.on('close', () => {
    const running = SUTS.filter(sut => output.includes(sut));
    if (running.length === 0) return res.json({ ok: true, stopped: [] });
    let done = 0;
    running.forEach(sut => {
      const p = spawn('docker', ['stop', sut]);
      p.on('close', () => { if (++done === running.length) res.json({ ok: true, stopped: running }); });
    });
  });
});

// Body: { sut: "next-app" }
app.post('/api/sut/switch', (req, res) => {
  const { sut } = req.body;
  if (!SUTS.includes(sut)) return res.status(400).json({ error: 'Unknown SUT' });
  spawnWithSSE(res, 'bash', ['./switch-sut.sh', sut], INFRA_DIR, `Переключение SUT: ${sut}`);
});

// Body: { sut: "next-app", modes: "cold,warm" }
app.post('/api/test/run', (req, res) => {
  const { sut, modes = 'cold,warm' } = req.body;
  if (!SUTS.includes(sut)) return res.status(400).json({ error: 'Unknown SUT' });
  spawnWithSSE(res, 'bash', ['./run-test.sh', sut, modes], INFRA_DIR, `Тест: ${sut} [${modes}]`);
});

app.post('/api/test/run-all', (req, res) => {
  spawnWithSSE(res, 'bash', ['./run-benchmarks.sh'], INFRA_DIR, 'Все тесты');
});

/** Читает metrics.log и агрегирует mean по каждому SUT */
app.get('/api/metrics/summary', (req, res) => {
  const metricsPath = path.join(INFRA_DIR, 'data', 'metrics.log');

  if (!fs.existsSync(metricsPath)) {
    return res.json({ summary: [] });
  }

  const lines = fs.readFileSync(metricsPath, 'utf8').split('\n').filter(Boolean);
  const events = lines
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);

  const buckets = {};
  for (const e of events) {
    if (!e.sut_id || !e.run_id) continue;
    if (['warmup', 'manual'].includes(e.mode_id)) continue;

    if (!buckets[e.sut_id]) buckets[e.sut_id] = { fcp: [], lcp: [], ttfb: [], nav: [], regen: [] };
    const b = buckets[e.sut_id];

    if (e.event_type === 'initial_load') {
      const w = e.web_metrics_ms || {};
      if (w.fcp != null) b.fcp.push(w.fcp);
      if (w.lcp != null) b.lcp.push(w.lcp);
      if (w.ttfb != null) b.ttfb.push(w.ttfb);
    }
    if (e.event_type?.startsWith('route_navigation')) {
      if (e.derived_ms?.total != null) b.nav.push(e.derived_ms.total);
    }
    if (e.event_type === 'list_regeneration') {
      if (e.derived_ms?.total != null) b.regen.push(e.derived_ms.total);
    }
  }

  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const summary = Object.entries(buckets).map(([sut_id, b]) => ({
    sut_id,
    fcp_mean: mean(b.fcp),
    lcp_mean: mean(b.lcp),
    ttfb_mean: mean(b.ttfb),
    nav_mean: mean(b.nav),
    regen_mean: mean(b.regen),
  }));

  res.json({ summary });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Dashboard backend on port ${PORT}`));
