import express from 'express';
import { createQwikCity } from '@builder.io/qwik-city/middleware/express';
import render from './entry.ssr';
import qwikCityPlan from '@qwik-city-plan';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const app = express();
const port = parseInt(process.env['PORT'] || '3000');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const buildDir = join(distDir, 'build');

// Статические клиентские активы Qwik: immutable (хэшированные имена файлов)
app.use('/build', express.static(buildDir, { immutable: true, maxAge: '1y' }));
// Остальное (manifest, sw.js и т.д.)
app.use(express.static(distDir, { maxAge: '10s' }));

const { router, notFound } = createQwikCity({ render, qwikCityPlan });
app.use(router);
app.use(notFound);

app.listen(port, () => {
    console.log(`Qwik SUT server running at http://localhost:${port}`);
});
