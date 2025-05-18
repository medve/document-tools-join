import react from "@vitejs/plugin-react";
import { resolve } from 'path';
import { defineConfig } from "vite";
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
    ],
    worker: {
        format: "es",
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
                entryFileNames: function (chunkInfo) {
                    // Rename __vite-browser-external to vite-browser-external
                    if (chunkInfo.name.startsWith('__')) {
                        return "".concat(chunkInfo.name.slice(2), ".js");
                    }
                    return '[name].js';
                },
                chunkFileNames: function (chunkInfo) {
                    // Ensure no chunks start with underscore
                    if (chunkInfo.name.startsWith('__')) {
                        return "".concat(chunkInfo.name.slice(2), ".js");
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
