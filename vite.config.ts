import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import type { Plugin } from 'vite'

// Escribe la lista de archivos generados para que el service worker los precargue (uso sin conexión).
function precacheList(): Plugin {
  return {
    name: 'lecto-precache',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html')
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files.map((f) => './' + f)) })
    },
  }
}

// `npm run build` → sitio estático con PWA (GitHub Pages, Netlify, etc.)
// `npm run build:single` → un único index.html autocontenido (vista previa en la nube)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [precacheList()])],
  build: {
    target: 'es2022',
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    copyPublicDir: mode !== 'single',
    chunkSizeWarningLimit: 2500,
  },
  worker: { format: 'es' },
}))
