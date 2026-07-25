import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/echarts-for-react') || id.includes('node_modules/zrender')) {
            return 'echarts-vendor';
          }
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) {
            return 'react-router-vendor';
          }
          if (
            id.includes('node_modules/i18next') ||
            id.includes('node_modules/react-i18next') ||
            id.includes('node_modules/i18next-http-backend')
          ) {
            return 'i18next-vendor';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/core/**/*.ts', 'src/ui/**/*.tsx', 'src/store/**/*.ts'],
      exclude: ['src/core/**/*.test.ts', 'src/core/**/*.spec.ts', '**/types.ts'],
      /**
       * SMA-260: Mindestschwellen unterhalb des aktuellen Ist-Stands (Puffer für
       * Test-zu-Test-Schwankungen), damit Regressionen auffallen statt dass die
       * Schwelle sofort rot ist. `ui/**` startet bewusst niedrig — die UI-Schicht
       * hat noch wenig Abdeckung (siehe #260) und die Schwelle wird mit weiteren
       * Tests schrittweise angehoben.
       */
      thresholds: {
        'src/core/**': { statements: 65, branches: 50, functions: 70, lines: 70 },
        'src/store/**': { statements: 15, branches: 10, functions: 12, lines: 18 },
        'src/ui/**': { statements: 8, branches: 5, functions: 8, lines: 8 },
      },
    },
  },
})
