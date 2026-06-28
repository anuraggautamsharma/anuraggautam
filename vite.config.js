import { resolve } from 'path'
import { defineConfig } from 'vite'

// Multi-page setup: home + three case-study pages.
export default defineConfig({
  root: '.',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        suggaa: resolve(__dirname, 'work/suggaa.html'),
        srijan: resolve(__dirname, 'work/srijan.html'),
        pipelinelab: resolve(__dirname, 'work/pipelinelab.html'),
      },
    },
  },
})
