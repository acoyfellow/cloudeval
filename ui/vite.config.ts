import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    sourcemap: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@cloudflare/kumo',
      '@phosphor-icons/react',
    ],
  },
})
