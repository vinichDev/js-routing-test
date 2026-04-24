import { defineConfig } from 'vite';
import { qwikCity } from '@builder.io/qwik-city/vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => ({
  plugins: [qwikCity(), qwikVite()],
  resolve: {
    alias: {
      // Matches tsconfig paths: ~/foo → src/foo
      '~': resolve(__dirname, 'src'),
    },
  },
  server: {
    headers: { 'Cache-Control': 'public, max-age=0' },
  },
  preview: {
    headers: { 'Cache-Control': 'public, max-age=600' },
  },
}));
