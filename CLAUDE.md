# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A performance benchmarking suite that compares 12 JavaScript web frameworks (Next.js App Router, Next.js Pages Router, Remix v2, Remix v3 alpha, React Router v7, SvelteKit, Vanilla JS, Astro, TanStack Start, SolidStart, Astro VT, Qwik) across routing scenarios. The test runner uses Playwright to automate browser interactions and collects Web Vitals metrics (FCP, LCP, TTFB, navigation timing, list regeneration latency).

## Running Tests

All orchestration scripts live in `infra/`. Run from that directory.

```bash
# Run full benchmark suite (all 8 SUTs sequentially, clears old logs)
cd infra && bash run-benchmarks.sh

# Run a single SUT
./run-test.sh next-app cold,warm
./run-test.sh remix-app cold
./run-test.sh remix3-app warm --clear   # --clear wipes previous logs first
./run-test.sh vanilla-app cold,warm
./run-test.sh svelte-app cold,warm
./run-test.sh react-router-app cold,warm
./run-test.sh next-pages-app cold,warm
./run-test.sh astro-app cold,warm
./run-test.sh tanstack-app cold,warm
./run-test.sh solidstart-app cold,warm
./run-test.sh astro-vt-app cold,warm
./run-test.sh qwik-app cold,warm

# Switch the active SUT without running tests
./switch-sut.sh next-app

# Analyze results
python3 analyze_metrics.py              # latest run
python3 analyze_metrics.py --all        # compare latest run per SUT
python3 analyze_metrics.py --run-id ID  # specific run
```

SUT profiles: `next-app` | `remix-app` | `remix3-app` | `vanilla-app` | `svelte-app` | `react-router-app` | `next-pages-app` | `astro-app` | `tanstack-app` | `solidstart-app` | `astro-vt-app` | `qwik-app`

## Per-App Commands

Each app under `apps/` is independent. Install and run separately.

| App | Dev | Build | Start |
|-----|-----|-------|-------|
| `apps/next-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/remix-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/remix3-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/vanilla-app` | `npm run dev` | — | `npm start` |
| `apps/svelte-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/react-router-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/next-pages-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/astro-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/tanstack-app` | `vite dev` | `vite build` | `node .output/server/index.mjs` |
| `apps/solidstart-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/astro-vt-app` | `npm run dev` | `npm run build` | `npm start` |
| `apps/qwik-app` | `npm run dev` | `npm run build` | `node server/entry.express.js` |

Remix v2 and Remix v3 also have `npm run typecheck`. Remix v3 has separate `npm run build:server` / `npm run build:client`. React Router v7 and Next.js Pages Router also have `npm run typecheck`.

## Docker Compose

All services are orchestrated via `infra/docker-compose.yml`. Apps run as Docker containers in normal test use — direct `npm start` is only for local development.

```bash
cd infra
docker compose up --build -d            # start base services
COMPOSE_PROFILES=next-app docker compose up -d   # start with a SUT
docker compose logs -f
```

## Architecture

```
Playwright Runner (runner/test.js)
        │
        ▼
Nginx Proxy :8000 (infra/nginx.conf.template)
   ├── /        → active SUT app :3000 (switched via COMPOSE_PROFILES)
   ├── /api/    → data-api :8080
   ├── /metrics/ → metrics-collector :8090
   └── /shared/ → shared static assets (30-day cache)
```

**Active SUT** is controlled by the `SUT_TARGET_HOST` env var passed to Nginx. `switch-sut.sh` tears down all SUT containers, starts the requested one, then restarts Nginx.

**Data flow:**
1. Runner navigates to pages via Nginx proxy
2. Browser JS sends performance events to `/metrics/client` (metrics-collector)
3. Runner sends run metadata to `/metrics/run`
4. Metrics are appended to `infra/data/metrics.log` and `infra/data/runs.log` (JSONL)
5. `analyze_metrics.py` reads those files and computes mean/median/P95/stddev

**Runner env vars** (set in docker-compose or shell before `run-test.sh`):
- `SUT_ID` — identifier string recorded in metrics (e.g., `next_app`)
- `RUNNER_MODES` — `cold,warm` (cold = fresh browser context, warm = cached)
- `RUNNER_ITERATIONS` — iterations per mode (default: 3)
- `RUNNER_REGEN_COUNT` — list regeneration clicks per iteration (default: 3)
- `RUNNER_HEADLESS` — `true`/`false`

## SUT Ports (local dev only)

| App | Port | SUT ID |
|-----|------|--------|
| next-app | 3001 | `next_app` |
| remix-app | 3002 | `remix_app` |
| remix3-app | 3003 | `remix3_app` |
| vanilla-app | 3004 | `vanilla_app` |
| svelte-app | 3005 | `svelte_app` |
| react-router-app | 3006 | `react_router_app` |
| next-pages-app | 3007 | `next_pages_app` |
| astro-app | 3008 | `astro_app` |
| tanstack-app | 3009 | `tanstack_app` |
| solidstart-app | 3010 | `solidstart_app` |
| astro-vt-app | 3011 | `astro_vt_app` |
| qwik-app | 3012 | `qwik_app` |

## Adding a New SUT

1. Create `apps/<name>/` with a server listening on a new port
2. Expose an `npm start` that serves on that port
3. Add Docker Compose service and profile in `infra/docker-compose.yml`
4. Add profile handling to `infra/switch-sut.sh` and `infra/run-benchmarks.sh`
5. Ensure the app emits `[data-test="page-home"]` and `[data-test="page-list"]` markers — the runner waits for these

## Adding a New SUT — Metric Requirements

Every SUT must implement three metric events sent to `/metrics/client`:

| Event | When | Key fields |
|-------|------|------------|
| `initial_load` | ~300ms after page load | FCP, LCP, TTFB via PerformanceObserver |
| `route_navigation_spa` / `route_navigation_direct` | After list hydrates with data | `t0NavClick` from `sessionStorage('nav_t0')`, `tDomReady = performance.now()` |
| `list_regeneration` | After each regenerate cycle | `t0` at click, `tDataReady` after fetch, `tDomReady` in RAF |

Navigation timing (`NAV: Total`) is measured as `tDomReady - t0NavClick`. The home page saves `performance.now()` to `sessionStorage('nav_t0')` on link click; the list page reads and clears it. For direct loads `nav_t0` is absent — `tDomReady` (from NavigationTiming) is used as-is.

Required `data-test` attributes: `page-home`, `link-to-list`, `page-list`, `list-item`, `btn-regenerate`.

## Documentation

`documentation/` serves dual purpose: functional reference and source material for the master's thesis. Keep it in sync with the code.

- After any code change that affects behavior or metrics: update the relevant `documentation/` file in the same response.
- If docs contradict the code: fix the docs.
- If a result table is outdated (e.g., measured before a methodology fix): add an `⚠️ устарело` notice with explanation.
- When adding research findings, include: what was measured, conditions (iterations, modes), and the conclusion.
- Structure by logical blocks — create subdirectories when a topic grows.

## Code Style

- Comment logical blocks and add descriptions to functions (JSDoc or inline)
- Keep functions focused — extract sub-functions when logic exceeds ~40 lines
- Follow Feature-Sliced Design (FSD) where applicable for new app code

## Reports

`reports/` contains change logs from a previous AI agent session. Read relevant reports before modifying an area — previous agent may have introduced errors or hallucinated code.

## Key Files

- `runner/test.js` — Playwright test logic; defines what metrics are collected and how
- `infra/analyze_metrics.py` — Metrics aggregation and reporting
- `infra/nginx.conf.template` — Proxy routing; logs include `rt`/`urt` (request/upstream timing) and trace headers
- `services/data-api/server.js` — Returns 1000 items; `?version=N` triggers deterministic reshuffle (Fisher–Yates, seed 1337+N)
- `services/metrics-collector/server.js` — Receives and stores browser performance events
- `documentation/` — Detailed docs on architecture, telemetry format, metric definitions, and per-SUT notes