import { resolve } from 'path'
import { defineConfig } from 'vite'

// Multipage site: home, work index, about, contact + three case studies.
export default defineConfig({
  root: '.',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        work: resolve(__dirname, 'work.html'),
        about: resolve(__dirname, 'about.html'),
        capabilities: resolve(__dirname, 'capabilities.html'),
        contact: resolve(__dirname, 'contact.html'),
        resume: resolve(__dirname, 'resume.html'),
        notfound: resolve(__dirname, '404.html'),
        suggaa: resolve(__dirname, 'work/suggaa.html'),
        suggaaDs: resolve(__dirname, 'work/suggaa-design-system.html'),
        suggaaSaathi: resolve(__dirname, 'work/suggaa-saathi.html'),
        suggaaWebsite: resolve(__dirname, 'work/suggaa-website.html'),
        srijan: resolve(__dirname, 'work/srijan.html'),
        pipelinelab: resolve(__dirname, 'work/pipelinelab.html'),
      },
    },
  },
})
