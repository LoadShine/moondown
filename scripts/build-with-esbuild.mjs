import { mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');

const require = createRequire(import.meta.url);
const esbuild = require('../node_modules/esbuild/lib/main.js');

mkdirSync(distDir, { recursive: true });

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
  'katex',
  'lucide',
  'mermaid',
  'tippy.js'
];

await esbuild.build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(distDir, 'index.js'),
  format: 'esm',
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  external,
  platform: 'browser',
  loader: {
    '.png': 'file'
  }
});

await esbuild.build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(distDir, 'index.cjs'),
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  external,
  platform: 'browser',
  loader: {
    '.png': 'file'
  }
});

cpSync(resolve(root, 'src/style.css'), resolve(distDir, 'style.css'));

const dts = `import type { Extension, EditorState } from '@codemirror/state';\nimport type { EditorView, ViewUpdate } from '@codemirror/view';\n\nexport type Theme = 'light' | 'dark';\nexport type MoondownTranslations = Record<string, string>;\nexport type AIStreamHandler = (\n  systemPrompt: string,\n  userPrompt: string,\n  signal: AbortSignal\n) => Promise<ReadableStream<string>>;\n\nexport type MoondownPluginOrder = 'pre' | 'post';\n\nexport interface MoondownSlashCommand {\n  id: string;\n  title: string;\n  titleKey?: string;\n  icon?: string;\n  keywords?: ReadonlyArray<string>;\n  execute: (view: EditorView) => void | Promise<void | AbortController>;\n}\n\nexport interface MoondownPluginSetupContext {\n  initialDoc: string;\n  config: Readonly<ResolvedEditorConfig>;\n}\n\nexport interface MoondownPluginViewContext {\n  view: EditorView;\n  config: Readonly<ResolvedEditorConfig>;\n}\n\nexport interface MoondownPlugin {\n  name: string;\n  order?: MoondownPluginOrder;\n  setup?: (context: MoondownPluginSetupContext) => Extension | Extension[] | void;\n  onViewCreated?: (context: MoondownPluginViewContext) => void;\n  onUpdate?: (update: ViewUpdate, context: MoondownPluginViewContext) => void;\n  onDestroy?: (context: MoondownPluginViewContext) => void;\n  slashCommands?: ReadonlyArray<MoondownSlashCommand>;\n}\n\nexport interface EditorConfig {\n  initialDoc?: string;\n  theme?: Theme;\n  syntaxHiding?: boolean;\n  placeholder?: string;\n  readOnly?: boolean;\n  onChange?: (update: ViewUpdate) => void;\n  onFocus?: () => void;\n  onBlur?: () => void;\n  translations?: MoondownTranslations;\n  locale?: string;\n  onAIStream?: AIStreamHandler;\n  plugins?: ReadonlyArray<MoondownPlugin>;\n}\n\nexport interface ResolvedEditorConfig {\n  theme: Theme;\n  syntaxHiding: boolean;\n  placeholder: string;\n  readOnly: boolean;\n  onChange?: (update: ViewUpdate) => void;\n  onFocus?: () => void;\n  onBlur?: () => void;\n  translations: MoondownTranslations;\n  locale: string;\n  onAIStream: AIStreamHandler | null;\n  plugins: ReadonlyArray<MoondownPlugin>;\n}\n\nexport interface Range {\n  from: number;\n  to: number;\n}\n\nexport interface Selection extends Range {\n  text: string;\n}\n\nexport interface Coordinates {\n  x: number;\n  y: number;\n  top?: number;\n  left?: number;\n  bottom?: number;\n  right?: number;\n}\n\nexport interface LineInfo {\n  number: number;\n  from: number;\n  to: number;\n  text: string;\n  length: number;\n}\n\nexport type ActionHandler = (view: EditorView) => boolean | Promise<boolean>;\nexport type StateChecker = (state: EditorState) => boolean;\nexport type EventHandler<T extends Event = Event> = (event: T, view: EditorView) => boolean | void;\n\nexport function defineMoondownPlugin<TPlugin extends MoondownPlugin>(plugin: TPlugin): TPlugin;\n\nexport function createExtensionPlugin(\n  name: string,\n  extension: Extension | Extension[],\n  options?: {\n    order?: MoondownPluginOrder;\n    slashCommands?: ReadonlyArray<MoondownSlashCommand>;\n  }\n): MoondownPlugin;\n\nexport interface MoondownClass {\n  view: EditorView;\n  getValue(): string;\n  setValue(value: string): void;\n  toggleSyntaxHiding(enabled: boolean): void;\n  setTheme(theme: Theme): void;\n  setReadOnly(enabled: boolean): void;\n  setPlaceholder(text: string): void;\n  setAIStreamHandler(handler: AIStreamHandler): void;\n  setTranslations(translations: MoondownTranslations): void;\n  setLocale(locale: string): void;\n  getView(): EditorView;\n  focus(): void;\n  openSearch(): void;\n  openReplace(): void;\n  destroy(): void;\n}\n\ndeclare class Moondown implements MoondownClass {\n  view: EditorView;\n  constructor(element: HTMLElement, initialDoc?: string, config?: EditorConfig);\n  getValue(): string;\n  setValue(value: string): void;\n  toggleSyntaxHiding(enabled: boolean): void;\n  setTheme(theme: Theme): void;\n  setReadOnly(enabled: boolean): void;\n  setPlaceholder(text: string): void;\n  setAIStreamHandler(handler: AIStreamHandler): void;\n  setTranslations(translations: MoondownTranslations): void;\n  setLocale(locale: string): void;\n  getView(): EditorView;\n  focus(): void;\n  openSearch(): void;\n  openReplace(): void;\n  destroy(): void;\n}\n\nexport { Moondown };\nexport default Moondown;\n`;

writeFileSync(resolve(distDir, 'index.d.ts'), dts, 'utf8');
