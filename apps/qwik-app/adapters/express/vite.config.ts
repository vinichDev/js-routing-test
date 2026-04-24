import { extendConfig } from '@builder.io/qwik-city/vite';
import baseConfig from '../../vite.config';

// No adapter plugin: avoids SSG pre-rendering which would make Express serve
// stale static HTML for /list, bypassing routeLoader$ and breaking run metrics.
export default extendConfig(baseConfig, () => ({
    build: {
        ssr: true,
        rollupOptions: { input: ['src/entry.express.tsx', '@qwik-city-plan'] },
        outDir: 'server',
    },
}));
