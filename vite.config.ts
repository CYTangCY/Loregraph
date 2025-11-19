import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  define: {
    // Polyfill process.env for compatibility with the Standalone code structure
    'process.env': {} 
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Use dev.html as the entry point for the build instead of the standalone index.html
        main: resolve(__dirname, 'dev.html')
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  server: {
    open: '/dev.html' // Open the dev file by default
  }
})