// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',
    ssr: true,
    // SERVER-ONLY runtime config: не попадает в клиентский бандл.
    // Переопределяется env-переменной NUXT_DATA_API_URL при запуске.
    runtimeConfig: {
        dataApiUrl: 'http://data-api:8080',
    },
    app: {
        head: {
            link: [{ rel: 'stylesheet', href: '/shared/global.css' }],
        },
    },
});
