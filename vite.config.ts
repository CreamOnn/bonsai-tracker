import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Served from https://creamonn.github.io/bonsai-tracker/
export default defineConfig({
  base: '/bonsai-tracker/',
  plugins: [svelte()],
  server: { port: 5173, strictPort: true },
})
