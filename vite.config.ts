import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://127.0.0.1:3000',
          ws: true,
        },
      },
      // Ignore builds, release packages, mobile assets, and tmp archives to prevent EBUSY/EPERM file locks
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/release/**',
          '**/android/**',
          '**/dist/**',
          '**/.git/**',
          '**/*.tmp/**',
          '**/*.tmp',
        ],
      },
    },
  };
});
