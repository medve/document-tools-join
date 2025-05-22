import react from "@vitejs/plugin-react";
import { resolve } from 'path';
import { defineConfig } from "vite";
import type { Plugin } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  worker: {
    format: "es",
    plugins: () => [
      {
        name: 'mupdf-worker',
        transform(code, id) {
          if (id.includes('mupdf')) {
            // Add global self reference and prevent document access
            code = `
              const self = globalThis;
              const window = self;
              const document = undefined;
              ${code}
            `;
            return {
              code,
              map: null
            };
          }
        }
      } as Plugin
    ]
  },
  optimizeDeps: {
    exclude: ["mupdf"], // Exclude mupdf from pre-bundling
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        worker: resolve(__dirname, "src/workers/mupdf.worker.ts"),
      },
      output: {
        format: 'es',
        entryFileNames: (chunkInfo) => {
          // Rename __vite-browser-external to vite-browser-external
          if (chunkInfo.name.startsWith('__')) {
            return `${chunkInfo.name.slice(2)}.js`;
          }
          return '[name].js';
        },
        chunkFileNames: (chunkInfo) => {
          // Ensure no chunks start with underscore
          if (chunkInfo.name.startsWith('__')) {
            return `${chunkInfo.name.slice(2)}.js`;
          }
          return '[name].js';
        },
        assetFileNames: '[name].[ext]'
      }
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    }
  }
});