// Инициализация браузерного прогона сценариев через единый proxy origin.
const {chromium} = require('playwright');
const crypto = require('crypto');

// Формирование идентификатора на основе UUID для исключения коллизий.
function createId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
}

// Утилита для задержки (sleep)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    sutIds: (process.env.SUT_ID || 'next_app').split(','),
    modes: (process.env.RUNNER_MODES || 'cold,warm').split(','),
    iterations: parseInt(process.env.RUNNER_ITERATIONS || '2', 10),
    regenCount: parseInt(process.env.RUNNER_REGEN_COUNT || '3', 10),
    headless: process.env.RUNNER_HEADLESS !== 'false'
};

// Хелпер для запуска браузера с повторными попытками (Resilience)
async function launchBrowserWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await chromium.launch({
                headless: RUN_CONFIG.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            });
        } catch (e) {
            console.error(`Attempt ${i + 1} to launch browser failed:`, e.message);
            if (i === retries - 1) throw e;
            await delay(2000);
        }
    }
}

// Выполнение одной итерации сценария в рамках открытого браузера.
async function runSingleIteration(browser, iteration, runId, modeId, regenCount, sutId) {
    console.log(`Iteration started [SUT=${sutId}]`, {iteration, runId, modeId, regenCount});

    // Инициализация контекста браузера (полная изоляция куков/кэша).
    const context = await browser.newContext();
    const page = await context.newPage();

    // Логирование сообщений браузерной страницы.
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.log(`PAGE LOG ERROR [sut=${sutId}, iter=${iteration}]:`, msg.text());
        }
    });

    // Логирование ошибок браузерной страницы.
    page.on('pageerror', (error) => {
        console.log(`PAGE ERROR [sut=${sutId}, iter=${iteration}]:`, error.message);
    });

    // Определение базового URL для маршрутизации на активный SUT через proxy.
    const baseUrl = 'http://proxy:80';
    const baseParams = `?run_id=${encodeURIComponent(runId)}&sut_id=${encodeURIComponent(sutId)}`;
    const homeUrl = `${baseUrl}/${baseParams}&mode_id=${encodeURIComponent(modeId)}&iteration=${encodeURIComponent(String(iteration))}`;

    // Выполнение прогрева для warm-режима.
    if (modeId === 'warm') {
        console.log('Warmup (SUT sync) started', {iteration, sutId});
        const warmupPage = await context.newPage();
        const warmupUrl = `${baseUrl}/${baseParams}&mode_id=warmup&iteration=0`;
        
        await warmupPage.goto(warmupUrl, {waitUntil: 'networkidle', timeout: 30000});
        await warmupPage.waitForSelector('[data-test="page-home"]', {timeout: 30000});
        await warmupPage.click('[data-test="link-to-list"]');
        await warmupPage.waitForSelector('[data-test="page-list"]', {timeout: 30000});
        
        await warmupPage.waitForTimeout(500);
        await warmupPage.close();
        console.log('Warmup (SUT sync) completed', {iteration, sutId});
    }

    // Основной сценарий
    await page.goto(homeUrl, {waitUntil: 'networkidle', timeout: 30000});
    console.log('Navigation to home completed', {iteration, sutId});

    await page.waitForSelector('[data-test="page-home"]', {timeout: 30000});
    await page.waitForSelector('[data-test="link-to-list"]', {timeout: 30000});

    // Переход на страницу списка
    await page.click('[data-test="link-to-list"]');
    console.log('Click on list link completed', {iteration, sutId});

    await page.waitForTimeout(1000);
    await page.waitForSelector('[data-test="page-list"]', {timeout: 30000});
    await page.waitForSelector('[data-test="list-item"]', {timeout: 30000});

    const count1 = await page.locator('[data-test="list-item"]').count();
    if (count1 !== 1000) {
        throw new Error(`Expected 1000 items, got ${count1}`);
    }

    // Регенерации.
    for (let regenIndex = 1; regenIndex <= regenCount; regenIndex++) {
        await page.click('[data-test="btn-regenerate"]');
        console.log('Regenerate click completed', {iteration, sutId, regenIndex});
        await page.waitForTimeout(500);
        const countRegen = await page.locator('[data-test="list-item"]').count();
        if (countRegen !== 1000) {
            throw new Error(`Expected 1000 items after regen ${regenIndex}, got ${countRegen}`);
        }
    }

    await page.waitForTimeout(500);
    
    // Прямой SSR-заход на страницу списка (Direct List Load)
    console.log('Direct list load started', {iteration, sutId});
    const directListPage = await context.newPage();
    const directListUrl = `${baseUrl}/list${baseParams}&mode_id=${encodeURIComponent(modeId)}&iteration=${encodeURIComponent(String(iteration))}&direct_load=true`;
    await directListPage.goto(directListUrl, {waitUntil: 'networkidle', timeout: 30000});
    await directListPage.waitForSelector('[data-test="page-list"]', {timeout: 30000});
    await directListPage.waitForSelector('[data-test="list-item"]', {timeout: 30000});
    await directListPage.waitForTimeout(500);
    await directListPage.close();
    console.log('Direct list load completed', {iteration, sutId});

    // Закрываем контекст, но НЕ браузер.
    await context.close();
    console.log('Iteration completed successfully', {iteration, sutId, runId, modeId});
}

async function main() {
    const {sutIds, modes, iterations, regenCount} = RUN_CONFIG;
    const runId = createId('run');

    console.log('Runner started', {runId, sutIds, modes, iterations, regenCount});

    for (const sutId of sutIds) {
        console.log(`\n--- Starting tests for SUT: ${sutId} ---`);
        for (const modeId of modes) {
            console.log(`Mode: ${modeId}`);

            // Регистрация запуска.
            const runMetadata = {
                schema_version: '1.0',
                run_id: runId,
                sut_id: sutId,
                mode_id: modeId,
                scenario_set: ['initial_home_load', 'nav_home_to_list', 'list_regen_single', 'initial_list_load'],
                iterations,
                environment: {
                    runner: 'playwright',
                    browser: 'chromium',
                    headless: RUN_CONFIG.headless,
                    origin: 'http://proxy:80',
                    regen_count: regenCount
                }
            };
            await postJson('http://proxy:80/metrics/run', runMetadata);
            
            // Запускаем браузер ОДИН РАЗ на режим (Mode).
            const browser = await launchBrowserWithRetry();

            try {
                for (let iteration = 1; iteration <= iterations; iteration++) {
                    await runSingleIteration(browser, iteration, runId, modeId, regenCount, sutId);
                    
                    // Малая пауза между итерациями для стабильности (освобождение памяти)
                    if (iteration < iterations) {
                        await delay(1000);
                    }
                }
            } finally {
                // Всегда закрываем браузер в конце режима.
                await browser.close();
                console.log(`Browser closed for Mode: ${modeId}`);
            }
        }
    }

    console.log('\nRunner completed successfully!', {runId});
}

main().catch((e) => {
    console.error('RUNNER ERROR:', e);
    process.exit(1);
});