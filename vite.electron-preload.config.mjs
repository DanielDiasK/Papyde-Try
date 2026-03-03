// vite.electron-preload.config.mjs
// Builds the Electron preload script to dist-electron/
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/preload.ts'),
            formats: ['cjs'],
            fileName: () => 'preload.js',
        },
        outDir: 'dist-electron',
        emptyOutDir: false, // don't wipe main.js
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
            ],
        },
    },
});
