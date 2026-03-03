// vite.electron-renderer.config.mjs
// Builds the React renderer to dist-renderer/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'dist-renderer',
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'index.html'),
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
