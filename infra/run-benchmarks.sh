#!/bin/bash
# Master Benchmark script: последовательный запуск всех SUT и вывод финального отчёта.

set -e

# Переход в директорию скрипта (infra)
cd "$(dirname "$0")"

echo "========================================================"
echo " 🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ ВСЕХ SUT"
echo "========================================================"

# 1. Полная очистка старых логов
echo "🧹 Шаг 0: Очистка старых данных..."
rm -f data/*.log
echo "   Логи в ./data/ очищены."

# 2. Список SUT для тестирования
SUTS=("next-app" "remix-app" "remix3-app" "vanilla-app" "svelte-app" "react-router-app" "next-pages-app" "astro-app" "tanstack-app" "solidstart-app" "astro-vt-app" "qwik-app" "nuxt-app")

# 3. Последовательный запуск для каждого SUT
for SUT in "${SUTS[@]}"; do
    echo ""
    echo "📡 Запуск теста для [$SUT]..."
    # Передаем "cold,warm" как режимы. Очистку (--clear) НЕ выполняем внутри run-test.sh, 
    # так как мы уже сделали её выше вручную.
    # Используем bash ./run-test.sh для надежности
    ./run-test.sh "$SUT" "cold,warm"
done

# 4. Итоговая аналитика по всем прогонам
echo ""
echo "========================================================"
echo " 📊 ГЕНЕРАЦИЯ ОБЩЕГО ОТЧЁТА (Benchmark results)"
echo "========================================================"

python3 analyze_metrics.py --all

echo ""
echo "🎉 Все тесты завершены успешно!"
echo "========================================================"
