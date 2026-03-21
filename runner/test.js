// Инициализация браузерного прогона сценариев через единый proxy origin.
const {chromium} = require('playwright');

// Формирование идентификатора на основе времени и случайной компоненты.
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Инкапсуляция HTTP POST запроса для регистрации паспорта прогона.
async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`POST ${url} failed with status ${response.status}`);
    }
}

// Формирование конфигурации текущего запуска Runner.
const RUN_CONFIG = {
    sutId: 'next_app',
    modes: ['cold', 'warm'],          // cold | warm
    iterations: 3,           // число повторов
    regenCount: 3,           // число повторных генераций списка
    headless: true
};

// Выполнение одной итерации сценария.
async function runSingleIteration(iteration, runId, modeId, regenCount) {
    console.log('Iteration started', {iteration, runId, modeId, regenCount});

    // Инициализация браузера.
    const browser = await chromium.launch({headless: RUN_CONFIG.headless});

    // Инициализация контекста браузера.
    const context = await browser.newContext();

    // Инициализация страницы.
    const page = await context.newPage();

    // Логирование сообщений браузерной страницы.
    page.on('console', (msg) => {
        console.log(`PAGE LOG [iter=${iteration}]:`, msg.type(), msg.text());
    });

    // Логирование ошибок браузерной страницы.
    page.on('pageerror', (error) => {
        console.log(`PAGE ERROR [iter=${iteration}]:`, error.message);
    });

    // Формирование URL главной страницы.
    const homeUrl =
        `http://proxy:80/?run_id=${encodeURIComponent(runId)}` +
        `&mode_id=${encodeURIComponent(modeId)}` +
        `&iteration=${encodeURIComponent(String(iteration))}`;

    // Выполнение прогрева для warm-режима.
    if (modeId === 'warm') {
        console.log('Warmup started', {iteration});

        const warmupPage = await context.newPage();
        await warmupPage.goto('http://proxy:80', {waitUntil: 'networkidle', timeout: 30000});
        await warmupPage.waitForSelector('[data-test="page-home"]', {timeout: 30000});
        await warmupPage.click('[data-test="link-to-list"]');
        await warmupPage.waitForSelector('[data-test="list-item"]', {timeout: 30000});
        await warmupPage.close();

        console.log('Warmup completed', {iteration});
    }

    // Выполнение перехода на главную страницу приложения.
    await page.goto(homeUrl, {waitUntil: 'networkidle', timeout: 30000});
    console.log('Navigation to home completed', {iteration});

    // Ожидание появления главной страницы.
    await page.waitForSelector('[data-test="page-home"]', {timeout: 30000});
    console.log('Home page detected', {iteration});

    // Ожидание ссылки перехода.
    await page.waitForSelector('[data-test="link-to-list"]', {timeout: 30000});
    console.log('List link detected', {iteration});

    // Выполнение перехода на страницу списка.
    await page.click('[data-test="link-to-list"]');
    console.log('Click on list link completed', {iteration});

    // Ожидание появления страницы списка.
    await page.waitForSelector('[data-test="page-list"]', {timeout: 30000});
    console.log('List page detected', {iteration});

    // Ожидание появления элементов списка.
    await page.waitForSelector('[data-test="list-item"]', {timeout: 30000});
    console.log('List items detected', {iteration});

    // Проверка количества элементов списка.
    const count1 = await page.locator('[data-test="list-item"]').count();
    console.log('Initial list items', {iteration, count: count1});

    if (count1 !== 1000) {
        throw new Error(`Expected 1000 items, got ${count1}`);
    }

    // Выполнение серии регенераций списка.
    for (let regenIndex = 1; regenIndex <= regenCount; regenIndex++) {
        await page.click('[data-test="btn-regenerate"]');
        console.log('Regenerate click completed', {iteration, regenIndex});

        await page.waitForTimeout(500);

        const countRegen = await page.locator('[data-test="list-item"]').count();
        console.log('List items after regenerate', {iteration, regenIndex, count: countRegen});

        if (countRegen !== 1000) {
            throw new Error(`Expected 1000 items after regen ${regenIndex}, got ${countRegen}`);
        }
    }

    await browser.close();
    console.log('Iteration completed successfully', {iteration, runId, modeId});
}

async function main() {
    const runId = createId('run');
    const {sutId, modes, iterations, regenCount} = RUN_CONFIG;

    console.log('Runner started', {runId, sutId, modes, iterations, regenCount});

    for (const modeId of modes) {

        // Формирование паспорта прогона.
        const runMetadata = {
            schema_version: '1.0',
            run_id: runId,
            sut_id: sutId,
            mode_id: modeId,
            scenario_set: ['initial_home_load', 'nav_home_to_list', 'list_regen_single'],
            iterations,
            environment: {
                runner: 'playwright',
                browser: 'chromium',
                headless: RUN_CONFIG.headless,
                origin: 'http://proxy:80',
                regen_count: regenCount
            }
        };

        // Отправка паспорта прогона в коллектор.
        await postJson('http://proxy:80/metrics/run', runMetadata);
        console.log('Run metadata sent');

        // Последовательное выполнение итераций.
        for (let iteration = 1; iteration <= iterations; iteration++) {
            await runSingleIteration(iteration, runId, modeId, regenCount);
        }
    }

    console.log('Runner completed successfully', {runId, sutId, modes, iterations, regenCount});
}

main().catch((e) => {
    console.error('RUNNER ERROR:', e);
    process.exit(1);
});