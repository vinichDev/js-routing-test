#!/bin/bash
set -e

# Переход в директорию infra (рядом со скриптом)
cd "$(dirname "$0")"

SUT_PROFILE=$1
MODES=${2:-"cold,warm"}
# Максимальное время ожидания готовности сервисов (секунды)
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-60}

if [ -z "$SUT_PROFILE" ]; then
    echo "Использование: $0 <sut-profile> [modes]"
    echo "Пример: $0 next-app cold,warm"
    echo "Доступные профили: next-app, remix-app, remix3-app"
    exit 1
fi

# Преобразование имени профиля docker compose (с дефисом) в SUT_ID для метрик (с подчеркиванием)
SUT_ID=$(echo "$SUT_PROFILE" | tr '-' '_')

# Опциональная очистка логов перед запуском
if [ "$3" == "--clear" ] || [ "$CLEAR_LOGS" == "true" ]; then
    echo "🧹 Очистка старых логов перед новым циклом тестирования..."
    rm -f data/*.log
    echo "   Данные в $(pwd)/data/ очищены."
fi

echo "========================================================"
echo " 🚦 Подготовка к тестированию SUT: $SUT_PROFILE"
echo " ⚙️ Режимы: $MODES"
echo "========================================================"

# ============================================================================
# 1. Запуск или переключение выбранного SUT (через существующий switch-sut.sh)
# ============================================================================
echo "=> Шаг 1: Переключение инфраструктуры на $SUT_PROFILE..."
./switch-sut.sh "$SUT_PROFILE"

# ============================================================================
# 2. Ожидание готовности metrics-collector (независимо от SUT)
# ============================================================================
echo ""
echo "=> Шаг 2: Ожидание готовности metrics-collector..."
ELAPSED=0
until curl -sf http://localhost:8090/health > /dev/null 2>&1; do
    if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
        echo "❌ Ошибка: metrics-collector не ответил за ${HEALTH_TIMEOUT} секунд"
        exit 1
    fi
    printf "   Ожидаем metrics-collector (%ds)...\r" "$ELAPSED"
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done
echo "   ✅ metrics-collector готов (${ELAPSED}s)"

# Небольшая пауза для стабилизации внутренней сети Docker (DNS propagation)
sleep 3

# ============================================================================
# 3. Ожидание готовности SUT через proxy (http://localhost:8000)
# ============================================================================
echo ""
echo "=> Шаг 3: Ожидание готовности SUT ($SUT_PROFILE) через proxy..."
ELAPSED=0
until curl -sf http://localhost:8000/ > /dev/null 2>&1; do
    if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
        echo "❌ Ошибка: SUT ($SUT_PROFILE) не ответил за ${HEALTH_TIMEOUT} секунд"
        docker compose logs --tail=30 "$SUT_PROFILE" 2>/dev/null || true
        exit 1
    fi
    printf "   Ожидаем SUT (%ds)...\r" "$ELAPSED"
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done
echo "   ✅ SUT готов (${ELAPSED}s)"

# ============================================================================
# 4. Запуск Runner'а в виде временного (--rm) Docker контейнера
# ============================================================================
echo ""
echo "=> Шаг 4: Запуск Playwright Runner..."
echo "   SUT_ID=$SUT_ID | MODES=$MODES"
echo ""

# Пересборка runner-образа (на случай изменений в runner/test.js)
docker compose build runner

# Запуск runner как одноразового контейнера
docker compose run --rm \
    -e SUT_ID="$SUT_ID" \
    -e RUNNER_MODES="$MODES" \
    runner

echo ""
echo "========================================================"
echo " ✅ Тестирование для $SUT_PROFILE успешно завершено!"
echo " 📊 Для просмотра результатов:"
echo "    cd $(pwd) && python3 analyze_metrics.py"
echo "========================================================"
