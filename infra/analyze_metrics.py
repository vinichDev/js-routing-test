#!/usr/bin/env python3
import json
import os
import sys
from collections import defaultdict
import statistics
import argparse
from typing import List, Dict, Any, Optional

# ==============================================================================
# КОНФИГУРАЦИЯ И ПУТИ
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
METRICS_LOG = os.path.join(DATA_DIR, 'metrics.log')
RUNS_LOG = os.path.join(DATA_DIR, 'runs.log')

# ==============================================================================
# ВСПОМОГАТЕЛЬНЫЕ КЛАССЫ И ФУНКЦИИ
# ==============================================================================

class MetricsLoader:
    @staticmethod
    def load_jsonl(path: str) -> List[Dict[str, Any]]:
        """Безопасная загрузка данных из JSONL-файла."""
        data = []
        if not os.path.exists(path):
            return data
        with open(path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    data.append(json.loads(line))
                except json.JSONDecodeError:
                    print(f"Предупреждение: Ошибка парсинга в {path}:{line_num}", file=sys.stderr)
                    continue
        return data

class StatsManager:
    @staticmethod
    def calculate(values: List[float]) -> Dict[str, Any]:
        """Вычисление расширенной статистики."""
        if not values:
            return {"mean": 0, "median": 0, "p95": 0, "stdev": 0, "count": 0, "min": 0, "max": 0}
        
        count = len(values)
        res = {
            "mean": statistics.mean(values),
            "median": statistics.median(values),
            "count": count,
            "min": min(values),
            "max": max(values),
            "p95": max(values) # дефолт
        }
        
        if count >= 2:
            res["stdev"] = statistics.stdev(values)
            res["p95"] = statistics.quantiles(values, n=20)[18]
        else:
            res["stdev"] = 0
            
        return res

class Reporter:
    @staticmethod
    def format_table(header: List[str], rows: List[List[Any]]):
        """Вывод данных в виде красивой таблицы."""
        if not rows:
            return
        
        col_widths = [len(h) for h in header]
        for row in rows:
            for i, val in enumerate(row):
                col_widths[i] = max(col_widths[i], len(str(val)))
        
        # Разделитель
        sep = "-+-" + "-+-".join(["-" * w for w in col_widths]) + "-+-"
        
        # Шапка
        fmt = " | " + " | ".join(["{:<" + str(w) + "}" for w in col_widths]) + " | "
        print(fmt.format(*header))
        print("-" * (sum(col_widths) + len(header) * 3 + 1))
        
        # Данные
        for row in rows:
            print(fmt.format(*row))

# ==============================================================================
# ОСНОВНАЯ ЛОГИКА АНАЛИЗА
# ==============================================================================

class MetricsAnalyzer:
    def __init__(self):
        self.runs = MetricsLoader.load_jsonl(RUNS_LOG)
        self.metrics_raw = MetricsLoader.load_jsonl(METRICS_LOG)
        self.run_map = {r.get('run_id'): r for r in self.runs if r.get('run_id')}
        self.results = defaultdict(lambda: defaultdict(lambda: {
            'iterations': set(),
            'metrics': defaultdict(list),
            'event_counts': defaultdict(int)
        }))

    def process_metrics(self, target_run_ids: Optional[List[str]] = None):
        """Обработка и группировка сырых данных."""
        for m in self.metrics_raw:
            run_id = m.get('run_id')
            if not run_id:
                continue
            
            if target_run_ids and run_id not in target_run_ids:
                continue

            # Фильтрация технических режимов
            mode_id = m.get('mode_id', 'unknown')
            if mode_id in ['manual', 'warmup']:
                continue

            sut_id = m.get('sut_id') or self.run_map.get(run_id, {}).get('sut_id', 'unknown')
            event_type = m.get('event_type')
            iter_id = int(m.get('iteration', 1))

            ctx = self.results[sut_id][mode_id]
            ctx['iterations'].add(iter_id)
            ctx['event_counts'][event_type] += 1
            
            # Парсинг конкретных метрик
            self._parse_event(m, ctx)

    def _parse_event(self, m: Dict[str, Any], ctx: Dict[str, Any]):
        event_type = m.get('event_type')
        
        # 1. Initial Load
        if event_type == 'initial_load':
            wms = m.get('web_metrics_ms', {})
            route = m.get('route', '/')
            prefix = "IL_LIST" if "/list" in route else "IL"
            for key, label in [('fcp', f'{prefix}: FCP'), ('lcp', f'{prefix}: LCP'), 
                               ('ttfb', f'{prefix}: TTFB'), ('initial_page_ready', f'{prefix}: Page Ready')]:
                if wms.get(key) is not None:
                    ctx['metrics'][label].append(wms[key])
        
        # 2. Navigation (SPA)
        elif event_type == 'route_navigation_spa':
            dms = m.get('derived_ms', {})
            mms = m.get('marks_ms', {})
            total = dms.get('total')
            if total:
                ctx['metrics']['NAV: Total (TTI)'].append(total)
            if mms.get('t_data_ready'):
                ctx['metrics']['NAV: Server+Net'].append(mms['t_data_ready'])
            if dms.get('render_after_data') and mms.get('t_data_ready'):
                ctx['metrics']['NAV: Render'].append(dms['render_after_data'])

        # 2a. Navigation Direct (SSR TTI)
        elif event_type == 'route_navigation_direct':
            total = m.get('derived_ms', {}).get('total')
            if total:
                ctx['metrics']['IL_LIST: TTI'].append(total)

        # 3. Regeneration
        elif event_type == 'list_regeneration':
            dms = m.get('derived_ms', {})
            mms = m.get('marks_ms', {})
            
            if dms.get('total'):
                ctx['metrics']['REGEN: Total'].append(dms['total'])
            if mms.get('t_data_ready'):
                ctx['metrics']['REGEN: Data Fetch'].append(mms['t_data_ready'])
            if dms.get('render_after_data'):
                ctx['metrics']['REGEN: Rendering'].append(dms['render_after_data'])

    def print_report(self, title: str):
        """Вывод детального отчета."""
        print(f"\n{'='*90}")
        print(f" 📊 {title}")
        print(f"{'='*90}\n")

        for sut in sorted(self.results.keys()):
            print(f"🚀 SUT: {sut.upper()}")
            print(f"{'='*40}")

            for mode in sorted(self.results[sut].keys()):
                data = self.results[sut][mode]
                iters_found = len(data['iterations'])
                
                # Проверка целостности (ожидаем обычно 3 итерации)
                status = "OK" if iters_found >= 3 else "INCOMPLETE"
                print(f"  🔹 Mode: {mode.upper()} [{status}]")
                print(f"  └ Iterations: {iters_found} | Events: {sum(data['event_counts'].values())}")
                
                header = ["Metric Group", "Measure", "Avg", "Med", "P95", "StdDev", "Cnt"]
                rows = []
                
                for m_name in sorted(data['metrics'].keys()):
                    group, name = m_name.split(': ')
                    s = StatsManager.calculate(data['metrics'][m_name])
                    rows.append([
                        group, name,
                        f"{s['mean']:>7.1f}", 
                        f"{s['median']:>7.1f}", 
                        f"{s['p95']:>7.1f}",
                        f"±{s['stdev']:<5.1f}",
                        s['count']
                    ])
                
                Reporter.format_table(header, rows)

                # SPA_savings: насколько SPA-навигация быстрее прямой загрузки страницы.
                nav_vals = data['metrics'].get('NAV: Total (TTI)', [])
                tti_vals = data['metrics'].get('IL_LIST: TTI', [])
                if nav_vals and tti_vals:
                    nav_med = StatsManager.calculate(nav_vals)['median']
                    tti_med = StatsManager.calculate(tti_vals)['median']
                    savings = tti_med - nav_med
                    label = f"+{savings:.0f} мс быстрее full-page" if savings > 0 else f"{savings:.0f} мс (нет выигрыша)"
                    print(f"  💡 SPA savings (median): IL_LIST TTI {tti_med:.0f} мс − NAV {nav_med:.0f} мс = {label}")
                print()

    def _print_glossary(self):
        print("\n📖 Глоссарий:")
        print("  IL (Initial Load): Загрузка страницы (Web Vitals).")
        print("  NAV (Navigation): Клиентский переход (Home -> List).")
        print("  NAV: Server+Net: Время от клика до начала рендера (server + network фаза).")
        print("  NAV: Render: Время от получения данных до отрисовки в браузере.")
        print("  SPA savings: IL_LIST TTI − NAV Total (выигрыш SPA vs full-page reload).")
        print("  REGEN (Regeneration): Обновление списка (Data + Render).")
        print("  StdDev: Стандартное отклонение (чем меньше, тем стабильнее результат).")

def main():
    parser = argparse.ArgumentParser(description='Аналитика производительности SUT.')
    parser.add_argument('--run-id', type=str, help='ID конкретного прогона')
    parser.add_argument('--all', action='store_true', help='Все последние прогоны для каждого SUT')
    args = parser.parse_args()

    analyzer = MetricsAnalyzer()
    
    if args.run_id:
        analyzer.process_metrics([args.run_id])
        title = f"ОТЧЕТ ПО ЗАПУСКУ: {args.run_id}"
    elif args.all:
        # Находим последние run_id для каждого SUT
        latest_runs = {}
        for m in analyzer.metrics_raw:
            rid = m.get('run_id')
            mid = m.get('mode_id')
            if rid and mid not in ['manual', 'warmup']:
                sut_id = m.get('sut_id') or analyzer.run_map.get(rid, {}).get('sut_id')
                if sut_id:
                    latest_runs[sut_id] = rid
        
        analyzer.process_metrics(list(latest_runs.values()))
        title = "СРАВНИТЕЛЬНЫЙ ОТЧЕТ (ПОСЛЕДНИЕ ЗАПУСКИ)"
    else:
        # Последний run_id вообще
        valid_metrics = [m for m in analyzer.metrics_raw if m.get('run_id') and m.get('mode_id') not in ['manual', 'warmup']]
        if not valid_metrics:
            print("Нет данных для анализа.")
            return
        last_rid = valid_metrics[-1].get('run_id')
        analyzer.process_metrics([last_rid])
        title = f"ПОСЛЕДНИЙ ЗАПУСК: {last_rid}"

    analyzer.print_report(title)

if __name__ == '__main__':
    main()

