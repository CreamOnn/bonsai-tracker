import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin } from 'vite'

// Unique per build. The app compares it with the deployed version.json to self-update.
const BUILD_ID = new Date().toISOString()

function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

// Served from https://creamonn.github.io/bonsai-tracker/
export default defineConfig({
  base: '/bonsai-tracker/',
  plugins: [svelte(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173, strictPort: true },
})
