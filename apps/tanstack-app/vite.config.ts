import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tanstackStart(),
    viteReact(),
    tsConfigPaths(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
})
