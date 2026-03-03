// vite.electron-main.config.mjs
// Builds the Electron main process (src/main.ts) to dist-electron/
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/main.ts'),
            formats: ['cjs'],
            fileName: () => 'main.js',
        },
        outDir: 'dist-electron',
        emptyOutDir: true,
        rollupOptions: {
            external: [
                'electron',
                'path',
                'node:path',
                'fs',
                'node:fs',
                'os',
                'node:os',
                'crypto',
                'stream',
                'http',
                'https',
                'net',
                'url',
                'node:url',
                'util',
                'events',
                'child_process',
                'electron-squirrel-startup',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
