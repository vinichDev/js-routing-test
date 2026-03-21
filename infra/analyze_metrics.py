#!/usr/bin/env python3
import json
import os
import sys
from collections import defaultdict
import statistics

import argparse

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
METRICS_LOG = os.path.join(DATA_DIR, 'metrics.log')
RUNS_LOG = os.path.join(DATA_DIR, 'runs.log')

def load_jsonl(path):
    data = []
    if not os.path.exists(path):
        return data
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    data.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return data

def analyze():
    parser = argparse.ArgumentParser(description='Анализ метрик производительности.')
    parser.add_argument('--run-id', type=str, help='ID конкретного запуска для анализа')
    parser.add_argument('--all', action='store_true', help='Анализировать все запуски в логах')
    args = parser.parse_args()

    runs = load_jsonl(RUNS_LOG)
    metrics = load_jsonl(METRICS_LOG)
    
    if not metrics:
        print("Нет данных для анализа.")
        return
    
    # run_id -> run_metadata mapping
    run_map = {r.get('run_id'): r for r in runs if r.get('run_id')}
    
    target_run_id = args.run_id
    if not args.all and not target_run_id:
        # По умолчанию берем последний run_id из metrics.log
        unique_run_ids = []
        seen = set()
        for m in metrics:
            rid = m.get('run_id')
            if rid and rid not in seen:
                unique_run_ids.append(rid)
                seen.add(rid)
        if unique_run_ids:
            target_run_id = unique_run_ids[-1]
            print(f"Анализ последнего запуска: {target_run_id}")
        else:
            print("Не удалось найти ID запусков.")
            return

    # Фильтрация метрик
    if not args.all:
        metrics = [m for m in metrics if m.get('run_id') == target_run_id]
        if not metrics:
            print(f"Нет данных для запуска ID: {target_run_id}")
            return

    # sut_id -> event_type -> list of durations
    data = defaultdict(lambda: defaultdict(list))
    
    for m in metrics:
        run_id = m.get('run_id')
        run_info = run_map.get(run_id, {})
        sut_name = run_info.get('sut_id') or m.get('sut_id', 'unknown')
        sut_label = f"{sut_name} (mode: {m.get('mode_id', 'unknown')})"
        
        event_type = m.get('event_type')
        val = None
        if event_type == 'initial_load':
            val = m.get('web_metrics_ms', {}).get('initial_page_ready')
        elif event_type in ['route_navigation', 'list_regeneration']:
            val = m.get('derived_ms', {}).get('total')
            
        if val is not None:
            data[sut_label][event_type].append(val)
            
    header = "ПО ВСЕМ ЗАПУСКАМ" if args.all else f"ЗАПУСК: {target_run_id}"
    print(f"=== СВОДНЫЙ АНАЛИЗ МЕТРИК ({header}) ===")
    
    if not data:
        print("Нет подходящих метрик для отображения.")
        return

    for sut, events in sorted(data.items()):
        print(f"\nSUT: {sut}")
        for ev, values in events.items():
            if not values:
                continue
            count = len(values)
            avg = statistics.mean(values)
            median = statistics.median(values)
            p95 = statistics.quantiles(values, n=20)[18] if count >= 2 else max(values)
            
            print(f"  {ev}:")
            print(f"    Количество:     {count}")
            print(f"    Среднее (Mean): {avg:.2f} ms")
            print(f"    Медиана (P50):  {median:.2f} ms")
            print(f"    Перцентиль P95: {p95:.2f} ms")

if __name__ == '__main__':
    analyze()
