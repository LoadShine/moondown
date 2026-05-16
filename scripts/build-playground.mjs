import { mkdirSync, rmSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'playground-dist');

const require = createRequire(import.meta.url);
const esbuild = require('../node_modules/esbuild/lib/main.js');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const result = await esbuild.build({
  entryPoints: [resolve(root, 'playground/main.ts')],
  outfile: resolve(outDir, 'main.js'),
  format: 'esm',
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  platform: 'browser',
  external: [
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
    'katex',
    'lucide',
    'mermaid',
    'tippy.js'
  ],
  loader: {
    '.png': 'file'
  }
});

const bundled = await esbuild.build({
  entryPoints: [resolve(root, 'playground/main.ts')],
  outfile: resolve(outDir, 'main.bundle.js'),
  format: 'esm',
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  platform: 'browser',
  loader: {
    '.png': 'file'
  }
});

cpSync(resolve(root, 'playground/style.css'), resolve(outDir, 'style.css'));
cpSync(resolve(root, 'playground/moondown-sample.svg'), resolve(outDir, 'moondown-sample.svg'));
cpSync(resolve(root, 'src/style.css'), resolve(outDir, 'moondown-style.css'));
cpSync(resolve(root, 'node_modules/tippy.js/dist/tippy.css'), resolve(outDir, 'tippy.css'));

const html = readFileSync(resolve(root, 'playground/index.html'), 'utf8')
  .replace('./main.ts', './main.bundle.js')
  .replace('</head>', '    <link rel="stylesheet" href="./moondown-style.css" />\n    <link rel="stylesheet" href="./tippy.css" />\n  </head>');

writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
