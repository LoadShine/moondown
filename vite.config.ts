import path from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts';

import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'Moondown',
            fileName: (format) => `moondown.${format}.js`
        },
        rollupOptions: {
            external: ['@codemirror/state', '@codemirror/view', '@codemirror/commands'],
            output: {
                globals: {
                    '@codemirror/state': 'CodeMirrorState',
                    '@codemirror/view': 'CodeMirrorView',
                    '@codemirror/commands': 'CodeMirrorCommands'
                }
            }
        }
    },
    css: {
        postcss: {
            plugins: [tailwind(), autoprefixer()],
        },
    },
    plugins: [dts()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})