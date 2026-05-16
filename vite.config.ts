import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const external = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/language-data',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/markdown',
  '@popperjs/core',
  'lucide',
  'tippy.js'
];

export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      plugins: [
        dts({
          include: ['src'],
          entryRoot: 'src',
          insertTypesEntry: true,
          rollupTypes: true,
          tsconfigPath: resolve(__dirname, 'tsconfig.json')
        })
      ],
      build: {
        emptyOutDir: true,
        sourcemap: true,
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'Moondown',
          formats: ['es', 'cjs'],
          fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs')
        },
        rollupOptions: {
          external,
          output: {
            globals: {
              lucide: 'lucide',
              'tippy.js': 'tippy'
            }
          }
        }
      }
    };
  }

  return {
    root: resolve(__dirname, 'playground'),
    server: {
      port: 5174,
      fs: {
        allow: [resolve(__dirname)]
      }
    },
    preview: {
      port: 4174
    },
    resolve: {
      alias: {
        '@moondown': resolve(__dirname, 'src')
      }
    }
  };
});
