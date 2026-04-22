// =============================================================================
// Клиентский entry-point для гидратации Remix v3 Component.
// Вызывает run() который находит маркеры <!--rmx:h:ID--> в DOM,
// загружает модули по URL из rmx-data, и гидрирует компоненты.
// =============================================================================

import { run } from 'remix/component';

// Запуск Remix Component Runtime.
// loadModule вызывается для каждого clientEntry при гидратации.
const runtime = run(document, {
    async loadModule(moduleUrl, exportName) {
        // Загружаем ESM модуль по URL (из Import Map).
        const mod = await import(moduleUrl);
        return mod[exportName];
    }
});

// Ожидание полной гидратации.
runtime.ready().then(() => {
    console.log('[Remix Component] Hydration complete.');
});
