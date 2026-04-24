<template>
    <main data-test="page-home" class="home-content">
        <h2>Добро пожаловать</h2>
        <p>Тестирование маршрутизации: <strong>{{ SUT_ID }}</strong></p>

        <nav style="margin-top: 2rem;">
            <!-- NuxtLink перехватывает клик и выполняет SPA-навигацию (Vue Router) -->
            <NuxtLink
                :to="listHref"
                data-test="link-to-list"
                class="btn-primary"
                @click="handleNavClick"
            >
                Перейти к списку
            </NuxtLink>
        </nav>
    </main>
</template>

<script setup lang="ts">
import { SUT_ID } from '~/lib/constants';

definePageMeta({ layout: 'default' });

const route = useRoute();

// Формирование href для ссылки с сохранением параметров прогона.
const listHref = computed(() => {
    const params = new URLSearchParams();
    const runId = route.query.run_id as string;
    const modeId = route.query.mode_id as string;
    const iteration = route.query.iteration as string;
    if (runId) params.set('run_id', runId);
    if (modeId) params.set('mode_id', modeId);
    if (iteration) params.set('iteration', iteration);
    const qs = params.toString();
    return `/list${qs ? '?' + qs : ''}`;
});

// Фиксация момента клика для вычисления NAV-метрики.
// Date.now() — абсолютное время (epoch ms), устойчиво к смене страницы.
function handleNavClick() {
    sessionStorage.setItem('nav_t0', String(Date.now()));
}
</script>
