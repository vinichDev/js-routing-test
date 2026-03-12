// Инициализация браузерного прогона сценария через единый proxy origin.
const {chromium} = require('playwright');

// Формирование идентификатора на основе времени и случайной компоненты.
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function main() {
    // Формирование параметров прогона.
    const runId = createId('run');
    const modeId = 'cold';

    console.log('Runner started', {runId, modeId});

    // Инициализация браузера.
    const browser = await chromium.launch({headless: true});
    console.log('Browser launched');

    // Инициализация страницы.
    const page = await browser.newPage();
    console.log('Page created');

    // Логирование сообщений браузерной страницы.
    page.on('console', (msg) => {
        console.log('PAGE LOG:', msg.type(), msg.text());
    });

    // Логирование ошибок браузерной страницы.
    page.on('pageerror', (error) => {
        console.log('PAGE ERROR:', error.message);
    });

    // Формирование URL главной страницы.
    const homeUrl = `http://proxy:80/?run_id=${encodeURIComponent(runId)}&mode_id=${encodeURIComponent(modeId)}`;
    console.log('Navigating to', homeUrl);

    // Переход на главную страницу приложения.
    await page.goto(homeUrl, {waitUntil: 'networkidle', timeout: 30000});
    console.log('Navigation to home completed');

    // Ожидание главной страницы.
    await page.waitForSelector('[data-test="page-home"]', {timeout: 30000});
    console.log('Home page detected');

    // Выполнение навигации на страницу списка.
    await page.waitForSelector('[data-test="link-to-list"]', { timeout: 30000 });
    await page.click('[data-test="link-to-list"]');
    console.log('Click on list link completed');

    // Ожидание появления страницы списка.
    await page.waitForSelector('[data-test="page-list"]', {timeout: 30000});
    console.log('List page detected');

    // Ожидание появления элементов списка.
    await page.waitForSelector('[data-test="list-item"]', {timeout: 30000});
    console.log('List items detected');

    // Проверка количества элементов списка.
    const count1 = await page.locator('[data-test="list-item"]').count();
    console.log('Initial list items:', count1);

    if (count1 !== 1000) {
        throw new Error(`Expected 1000 items, got ${count1}`);
    }

    // Выполнение нажатия на кнопку перестановки списка.
    await page.click('[data-test="btn-regenerate"]');
    console.log('Regenerate click completed');

    // Ожидание завершения обновления.
    await page.waitForTimeout(1000);

    // Повторная проверка количества элементов списка.
    const count2 = await page.locator('[data-test="list-item"]').count();
    console.log('After regenerate list items:', count2);

    if (count2 !== 1000) {
        throw new Error(`Expected 1000 items after regen, got ${count2}`);
    }

    console.log('Runner completed successfully', {runId, modeId});

    await browser.close();
}

main().catch((e) => {
    console.error('RUNNER ERROR:', e);
    process.exit(1);
});