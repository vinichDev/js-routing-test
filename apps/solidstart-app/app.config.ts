import { defineConfig } from '@solidjs/start/config'

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  // Отключаем SSR — маршруты грузятся динамически, гибридный режим вызывает
  // конфликт пустой Suspense-границы с клиентским рендером SolidJS.
  // Метрики FCP/LCP/TTFB всё равно фиксируются через PerformanceObserver.
  ssr: false,
})
