// SvelteKit конфигурация — production сборка через Node.js адаптер.
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        // adapter-node создаёт standalone Node.js сервер (npm start → node build/index.js).
        adapter: adapter({ out: 'build' }),
    }
};

export default config;
