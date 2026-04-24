#!/bin/bash
# Скрипт для безопасного переключения SUT (System Under Test)

set -e

SUT=$1

if [ -z "$SUT" ]; then
  echo "Ошибка: Укажите SUT для переключения."
  echo "Использование: ./switch-sut.sh <next-app|remix-app|remix3-app|vanilla-app|svelte-app|react-router-app|next-pages-app|astro-app|tanstack-app|solidstart-app|astro-vt-app|qwik-app|nuxt-app>"
  exit 1
fi

echo "Останавливаем все SUT..."
docker rm -f next-app remix-app remix3-app vanilla-app svelte-app react-router-app next-pages-app astro-app tanstack-app solidstart-app astro-vt-app qwik-app nuxt-app 2>/dev/null || true

echo "Запускаем $SUT..."
COMPOSE_PROFILES=$SUT docker compose up --build -d

# Перезапускаем proxy чтобы Nginx сбросил кэш upstream-соединений
# (metrics-collector и data-api пересоздаются, старые IP уже не валидны)
echo "Перезапускаем proxy для обновления upstream маршрутов..."
docker compose restart proxy

echo ""
echo "=== Состояние контейнеров ==="
docker compose ps

echo ""
echo "=== Логи $SUT (последние 15 строк) ==="
docker compose logs --tail=15 $SUT

echo ""
echo "Успешно! $SUT работает на http://localhost:8000/"
