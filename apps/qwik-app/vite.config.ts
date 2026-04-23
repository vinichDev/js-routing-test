import { defineConfig } from 'vite';
import { qwikCity } from '@builder.io/qwik-city/vite';
import { qwikVite } from '@builder.io/qwik/optimizer';

export default defineConfig(() => ({
  plugins: [qwikCity(), qwikVite()],
  server: {
    headers: { 'Cache-Control': 'public, max-age=0' },
  },
  preview: {
    headers: { 'Cache-Control': 'public, max-age=600' },
  },
}));
