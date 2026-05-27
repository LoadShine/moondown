import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { JSDOM } from 'jsdom';
import Moondown from '../dist/index.js';

import {
  escapeRegExp,
  isMarkdownImage,
  parseMarkdownImage,
  createHeadingPrefix,
  getHeadingLevel,
  isOrderedListItem,
  isUnorderedListItem,
  extractListNumber,
  stripBase64Images,
  getCurrentLine,
  getLinesInRange,
  getTextWithContext,
  isSelectionEmpty,
  getSelectedText,
  replaceSelection,
  insertAt,
  applyChanges,
  createElement,
  createIconElement,
  removeElement,
  getDataAttributes,
  debounce,
  defineMoondownPlugin,
  createExtensionPlugin,
} from '../dist/index.js';

import {
  setHeader,
  toggleList,
  toggleInlineStyle,
  isHeaderActive,
  isInlineStyleActive,
  isListActive,
} from '../src/extensions/bubble-menu/content-functions';
import { EditorPluginRuntime } from '../src/editor/runtime/editor-plugin-runtime';
import {
  filterSlashCommands,
  findSelectableSlashCommandIndex,
  normalizeSelectedSlashCommandIndex,
  resolveSlashCommands,
} from '../src/extensions/slash-command/commands';
import { SLASH_COMMAND_FILTER_REGEX, slashCommandState } from '../src/extensions/slash-command/fields';
import { slashCommandPlugin } from '../src/extensions/slash-command/slash-command';
import { pluginSlashCommandsState, translationsState } from '../src/extensions/runtime/editor-runtime-state';
import { resolveWidgetEditTarget } from '../src/extensions/widget-edit-bubble';

import {
  updateLists,
  getListInfo,
  generateListItem,
} from '../src/extensions/correct-list/list-functions';

import buildPipeTable from '../src/extensions/table/build-pipe';
import calculateColSizes from '../src/extensions/table/calculate-col-sizes';
import computeCSS from '../src/extensions/table/compute-css';
import { buildTableHelperStyles } from '../src/extensions/table/table-helper-styles';
import { md2html } from '../src/extensions/table/markdown-to-html';
import { rangeInSelection } from '../src/extensions/table/table-functions';
import { isImageSelection, positionAIPolishPanel } from '../src/extensions/bubble-menu/bubble-menu-positioning';
import {
  applyDraggingVisual,
  buildImageMoveChanges,
  createImageWidgetElements,
  resetDraggingVisual,
} from '../src/extensions/image/image-widget-helpers';
import {
  buildAIPolishSystemPrompt,
  buildAIPolishUserPrompt,
  resolveAIPolishTargetLanguage,
} from '../src/extensions/bubble-menu/ai-polish-prompts';
import { TableEditorEdgeButtons } from '../src/extensions/table/table-editor-edge-buttons';
import TableEditor from '../src/extensions/table/table-editor';
import { TableEditorModel } from '../src/extensions/table/table-editor-model';
import { rebuildEditableTableDom, selectEditableCell } from '../src/extensions/table/table-editor-dom';
import { parseMarkdownTable } from '../src/extensions/table/table-functions';
import {
  moveToNextCell,
  moveToNextRow,
  moveToPreviousCell,
  moveToPreviousRow,
} from '../src/extensions/table/table-editor-navigation';
import { TableWidgetSaveController } from '../src/extensions/table/table-widget-save';
import { collectTableRanges } from '../src/extensions/table/table-widget-position';
import { tablePositions, updateTablePosition } from '../src/extensions/table/table-position';

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

let dom: JSDOM;

describe('moondown node:test suite', () => {
  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const g = globalThis as any;
    g.window = dom.window;
    g.document = dom.window.document;
    g.HTMLElement = dom.window.HTMLElement;
    g.HTMLDivElement = dom.window.HTMLDivElement;
    g.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
    g.HTMLButtonElement = dom.window.HTMLButtonElement;
    g.HTMLSpanElement = dom.window.HTMLSpanElement;
    g.HTMLImageElement = dom.window.HTMLImageElement;
    g.HTMLTableCellElement = dom.window.HTMLTableCellElement;
    g.HTMLTableRowElement = dom.window.HTMLTableRowElement;
    g.DOMRect = dom.window.DOMRect;
    g.MouseEvent = dom.window.MouseEvent;
    g.Node = dom.window.Node;
    g.Window = dom.window.Window;
    g.AbortController = dom.window.AbortController;
    g.AbortSignal = dom.window.AbortSignal;
    g.MutationObserver = dom.window.MutationObserver;
    Object.defineProperty(g, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });

    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
    g.cancelAnimationFrame = (id: number) => clearTimeout(id);

    if (!(g.navigator as any).clipboard) {
      (g.navigator as any).clipboard = {
        writeText: async () => undefined,
      };
    }

    g.alert = () => undefined;
  });

  afterEach(() => {
    dom.window.close();
    const g = globalThis as any;
    delete g.window;
    delete g.document;
    delete g.HTMLElement;
    delete g.HTMLDivElement;
    delete g.HTMLTextAreaElement;
    delete g.HTMLButtonElement;
    delete g.HTMLSpanElement;
    delete g.HTMLImageElement;
    delete g.HTMLTableCellElement;
    delete g.HTMLTableRowElement;
    delete g.DOMRect;
    delete g.MouseEvent;
    delete g.Node;
    delete g.Window;
    delete g.AbortController;
    delete g.AbortSignal;
    delete g.MutationObserver;
    delete g.ResizeObserver;
    delete g.requestAnimationFrame;
    delete g.cancelAnimationFrame;
    delete g.alert;
  });

  test('string-utils: should cover markdown/list/regex helpers', () => {
    assert.equal(escapeRegExp('a+b*c?.^$()[]{}|\\'), 'a\\+b\\*c\\?\\.\\^\\$\\(\\)\\[\\]\\{\\}\\|\\\\');

    assert.equal(isMarkdownImage('![alt](https://example.com/a.png)'), true);
    assert.equal(isMarkdownImage('![alt](https://example.com/a_(b).png)'), true);
    assert.equal(isMarkdownImage(' [a](b) '), false);
    assert.deepEqual(parseMarkdownImage('![alt](https://example.com/a_(b).png)'), {
      alt: 'alt',
      src: 'https://example.com/a_(b).png',
    });

    assert.equal(createHeadingPrefix(1), '# ');
    assert.equal(createHeadingPrefix(6), '###### ');
    assert.throws(() => createHeadingPrefix(0));

    assert.equal(getHeadingLevel('### title'), 3);
    assert.equal(getHeadingLevel('not heading'), null);

    assert.equal(isOrderedListItem('12. a'), true);
    assert.equal(isOrderedListItem('- a'), false);
    assert.equal(isUnorderedListItem('- a'), true);
    assert.equal(isUnorderedListItem('* a'), false);

    assert.equal(extractListNumber('19. x'), 19);
    assert.equal(extractListNumber('x'), null);

    assert.equal(stripBase64Images('A ![Pic](data:image/png;base64,AAAA) B'), 'A [Image: Pic] B');
  });

  test('core api: init/get/set/config/focus/destroy should work', () => {
    const root = document.createElement('div');
    root.style.width = '800px';
    root.style.height = '400px';
    document.body.appendChild(root);

    const events: string[] = [];

    const editor = new Moondown(root, '# hello', {
      placeholder: 'type',
      readOnly: false,
      syntaxHiding: true,
      theme: 'light',
      locale: 'en',
      onChange: () => events.push('change'),
      onFocus: () => events.push('focus'),
      onBlur: () => events.push('blur'),
      onAIStream: async () => {
        return new ReadableStream<string>({
          start(controller) {
            controller.enqueue('ok');
            controller.close();
          },
        });
      },
      translations: {
        'moondown.ai.thinking': 'thinking...',
      },
    });

    assert.equal(editor.getValue().includes('# hello'), true);

    editor.setValue('changed');
    assert.equal(editor.getValue(), 'changed');

    editor.setReadOnly(true);
    editor.setPlaceholder('new placeholder');
    editor.setTheme('dark');
    editor.toggleSyntaxHiding(false);
    editor.setLocale('zh-CN');

    editor.focus();
    assert.ok(editor.getView());

    editor.setValue('abc');
    assert.equal(events.includes('change'), true);

    editor.destroy();
    root.remove();
  });

  test('plugin api: should run setup/runtime hooks and extension plugins', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const lifecycleEvents: string[] = [];
    let hookUpdateCount = 0;
    let extensionUpdateCount = 0;

    const lifecyclePlugin = defineMoondownPlugin({
      name: 'lifecycle-plugin',
      order: 'post',
      setup: ({ initialDoc, config }) => {
        lifecycleEvents.push(`setup:${initialDoc}`);
        assert.equal(config.theme, 'light');
        return [];
      },
      onViewCreated: ({ view }) => {
        lifecycleEvents.push(`view:${view.state.doc.toString()}`);
      },
      onUpdate: (update) => {
        if (update.docChanged) {
          hookUpdateCount += 1;
        }
      },
      onDestroy: () => {
        lifecycleEvents.push('destroy');
      },
    });

    const extensionPlugin = createExtensionPlugin(
      'update-counter',
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          extensionUpdateCount += 1;
        }
      })
    );

    const editor = new Moondown(root, 'hello plugin', {
      plugins: [lifecyclePlugin, extensionPlugin],
    });

    assert.equal(lifecycleEvents[0], 'setup:hello plugin');
    assert.equal(lifecycleEvents.some((event) => event.startsWith('view:')), true);

    editor.setValue('changed by plugin');
    assert.equal(hookUpdateCount > 0, true);
    assert.equal(extensionUpdateCount > 0, true);

    editor.destroy();
    assert.equal(lifecycleEvents.includes('destroy'), true);
    root.remove();
  });

  test('plugin api: should register plugin slash command and execute through slash resolver', async () => {
    let commandExecuted = 0;

    const plugin = defineMoondownPlugin({
      name: 'slash-plugin',
      slashCommands: [
        {
          id: 'insert-plugin-signature',
          title: 'Plugin Signature',
          icon: 'puzzle',
          keywords: ['signature'],
          execute: () => {
            commandExecuted += 1;
          },
        },
      ],
    });

    const runtime = new EditorPluginRuntime({
      plugins: [plugin],
      initialDoc: '',
      config: {
        theme: 'light',
        syntaxHiding: true,
        placeholder: '',
        readOnly: false,
        translations: {},
        locale: 'en',
        onAIStream: null,
        plugins: [plugin],
      },
    });

    const resolved = resolveSlashCommands(runtime.runtimeSlashCommands);
    const filtered = filterSlashCommands(resolved, 'signature', {});
    const pluginCommand = filtered.find((command) => command.id === 'insert-plugin-signature');
    assert.ok(pluginCommand);
    await pluginCommand.execute({} as EditorView);

    assert.equal(commandExecuted, 1);
  });

  test('slash command helpers: should normalize divider selection and only match at line start', () => {
    const commands = resolveSlashCommands([]);
    const dividerIndex = commands.findIndex((command) => command.isDivider);
    assert.notEqual(dividerIndex, -1);

    const normalized = normalizeSelectedSlashCommandIndex(commands, dividerIndex);
    assert.equal(normalized, 0);

    const nextSelectable = findSelectableSlashCommandIndex(commands, dividerIndex + 1, 1);
    assert.equal(nextSelectable >= 0, true);
    assert.equal(commands[nextSelectable].isDivider, undefined);

    const previousSelectable = findSelectableSlashCommandIndex(commands, dividerIndex - 1, -1);
    assert.equal(previousSelectable >= 0, true);
    assert.equal(commands[previousSelectable].isDivider, undefined);

    const slashMatch = SLASH_COMMAND_FILTER_REGEX.exec('/公式');
    assert.equal(slashMatch?.[1], '公式');
    assert.equal(SLASH_COMMAND_FILTER_REGEX.exec('输入 /公式'), null);
    assert.equal(SLASH_COMMAND_FILTER_REGEX.exec('输入 公式'), null);
  });

  test('slash command plugin: should remove document click listener on destroy', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const addedClickListeners: Array<EventListenerOrEventListenerObject> = [];
    const removedClickListeners: Array<EventListenerOrEventListenerObject> = [];

    const originalAddEventListener = document.addEventListener;
    const originalRemoveEventListener = document.removeEventListener;

    const addSpy = function(
      this: Document,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions | boolean
    ): void {
      if (type === 'click') {
        addedClickListeners.push(listener);
      }
      originalAddEventListener.call(this, type, listener, options as any);
    };

    const removeSpy = function(
      this: Document,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: EventListenerOptions | boolean
    ): void {
      if (type === 'click') {
        removedClickListeners.push(listener);
      }
      originalRemoveEventListener.call(this, type, listener, options as any);
    };

    (document as any).addEventListener = addSpy;
    (document as any).removeEventListener = removeSpy;

    try {
      const state = EditorState.create({
        doc: '',
        extensions: [
          slashCommandState,
          translationsState,
          pluginSlashCommandsState,
          slashCommandPlugin,
        ],
      });
      const view = new EditorView({ state, parent: host });
      view.destroy();
    } finally {
      (document as any).addEventListener = originalAddEventListener;
      (document as any).removeEventListener = originalRemoveEventListener;
      host.remove();
    }

    assert.equal(addedClickListeners.length > 0, true);
    assert.equal(removedClickListeners.length > 0, true);

    const removedSet = new Set(removedClickListeners);
    const leaked = addedClickListeners.filter((listener) => !removedSet.has(listener));
    assert.deepEqual(leaked, []);
  });

  test('widget edit target: should resolve image/mermaid/latex selections', () => {
    const imageDoc = '![Alt](https://example.com/a.png)';
    const imageState = EditorState.create({ doc: imageDoc });
    const imageTarget = resolveWidgetEditTarget(imageState, 0, imageDoc.length);
    assert.equal(imageTarget?.kind, 'image');
    assert.equal(imageTarget?.value, 'https://example.com/a.png');
    assert.equal(
      imageTarget?.buildUpdatedMarkdown('https://example.com/b.png'),
      '![Alt](https://example.com/b.png)'
    );

    const mermaidDoc = ['```mermaid', 'flowchart TD', '  A --> B', '```'].join('\n');
    const mermaidState = EditorState.create({ doc: mermaidDoc });
    const mermaidTarget = resolveWidgetEditTarget(mermaidState, 0, mermaidDoc.length);
    assert.equal(mermaidTarget?.kind, 'mermaid');
    assert.equal(mermaidTarget?.value, 'flowchart TD\n  A --> B');
    assert.equal(
      mermaidTarget?.buildUpdatedMarkdown('flowchart TD\n  X --> Y'),
      ['```mermaid', 'flowchart TD', '  X --> Y', '```'].join('\n')
    );

    const latexDoc = ['```latex', '\\\\frac{a}{b}', '```'].join('\n');
    const latexState = EditorState.create({ doc: latexDoc });
    const latexTarget = resolveWidgetEditTarget(latexState, 0, latexDoc.length);
    assert.equal(latexTarget?.kind, 'latex');
    assert.equal(latexTarget?.value, '\\\\frac{a}{b}');
  });

  test('editor-utils: should operate on selection/content correctly', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = EditorState.create({ doc: 'line1\nline2\nline3' });
    const view = new EditorView({ state, parent: host });

    view.dispatch({ selection: { anchor: 7 } });
    assert.equal(getCurrentLine(view.state).text, 'line2');

    const lines = getLinesInRange(view.state, 0, view.state.doc.length);
    assert.deepEqual(lines.map((l) => l.text), ['line1', 'line2', 'line3']);

    const ctx = getTextWithContext(view.state, 2, 5, 999);
    assert.equal(ctx.start, 0);
    assert.equal(ctx.end, view.state.doc.length);

    view.dispatch({ selection: { anchor: 0, head: 5 } });
    assert.equal(isSelectionEmpty(view.state), false);
    assert.equal(getSelectedText(view.state), 'line1');

    replaceSelection(view, 'hello');
    assert.equal(view.state.doc.toString().startsWith('hello'), true);

    insertAt(view, 0, 'Say ');
    assert.equal(view.state.doc.toString().startsWith('Say hello'), true);

    applyChanges(view, [{ from: 0, to: 3, insert: 'Tell' }]);
    assert.equal(view.state.doc.toString().startsWith('Tell'), true);

    view.destroy();
    host.remove();
  });

  test('dom-utils: should provide element helpers and debounce', async () => {
    const el = createElement('div', 'a b', { 'data-k': 'v', role: 'button' });
    assert.equal(el.className, 'a b');
    assert.equal(el.getAttribute('data-k'), 'v');

    const icon = createIconElement('sparkles', 'icon-wrap');
    assert.equal(icon.className, 'icon-wrap');
    assert.equal(icon.innerHTML.includes('data-lucide="sparkles"'), true);

    const parent = document.createElement('div');
    const child = document.createElement('span');
    child.setAttribute('data-name', 'moondown');
    child.setAttribute('data-mode', 'test');
    parent.appendChild(child);

    assert.deepEqual(getDataAttributes(child), { name: 'moondown', mode: 'test' });

    removeElement(child);
    assert.equal(parent.children.length, 0);

    let called = '';
    const d = debounce((v: string) => {
      called = v;
    }, 10);

    d('a');
    d('b');
    d('c');

    await new Promise((r) => setTimeout(r, 20));
    assert.equal(called, 'c');
  });

  test('content-functions: should toggle heading/list/inline styles and active state', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const view = new EditorView({
      state: EditorState.create({ doc: 'hello\nworld' }),
      parent: host,
    });

    view.dispatch({ selection: { anchor: 1, head: 5 } });
    setHeader(view, 2);
    assert.equal(view.state.doc.toString().startsWith('## hello'), true);

    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    toggleList(view, false);
    assert.equal(view.state.doc.toString().includes('- ## hello'), true);

    toggleList(view, false);
    assert.equal(view.state.doc.toString().includes('- ## hello'), false);

    view.dispatch({ selection: { anchor: 0, head: 5 } });
    toggleInlineStyle(view, '**');
    assert.equal(view.state.doc.toString().includes('**'), true);
    assert.equal(isInlineStyleActive(view.state, '**'), true);

    view.dispatch({ selection: { anchor: 1 } });
    assert.equal(isHeaderActive(view.state, 2), false);

    const linePos = view.state.doc.toString().indexOf('world') + 1;
    view.dispatch({ selection: { anchor: linePos } });
    assert.equal(isListActive(view.state, false), false);

    view.destroy();
    host.remove();
  });

  test('correct-list: updateLists/getListInfo/generateListItem should work', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const view = new EditorView({
      state: EditorState.create({ doc: '1. A\n3. B\n  1. B1\n  8. B2\n2. C' }),
      parent: host,
    });

    updateLists(view);
    const content = view.state.doc.toString();
    assert.equal(content.includes('2. B'), true);
    assert.equal(content.includes('2.1. B1'), true);
    assert.equal(content.includes('2.2. B2'), true);

    const info = getListInfo(view.state, 1);
    assert.equal(info?.type, 'ordered');
    assert.equal(generateListItem('unordered', 2), '  * ');

    view.destroy();
    host.remove();
  });

  test('table utils: should cover pipe build/align/css/html/range selection', () => {
    const sizes = calculateColSizes([
      ['A', 'BBBB'],
      ['LongHeader', 'x\nyyyyy'],
    ]);
    assert.deepEqual(sizes, [10, 5]);

    const pipe = buildPipeTable(
      [
        ['Name', 'Score', 'Remark'],
        ['Alice', '98', 'Excellent'],
      ],
      ['left', 'center', 'right']
    );
    assert.equal(pipe.includes('| Name'), true);
    assert.equal(pipe.includes(':'), true);

    assert.throws(() => buildPipeTable([['OnlyHeader']], ['left']));

    const styleText = buildTableHelperStyles(20);
    assert.equal(styleText.includes('height: 30px'), true);
    assert.equal(styleText.includes('width: 24px'), true);
    assert.equal(styleText.includes('height: 12px'), true);

    const style = computeCSS(20) as HTMLStyleElement;
    assert.equal(style.tagName, 'STYLE');
    assert.equal(style.textContent?.includes('height: 30px'), true);

    const html = md2html('**Bold** and *italic* and `code` and ~~del~~ and ==mark== and ~under~');
    assert.equal(html.includes('<strong>'), true);
    assert.equal(html.includes('<em>'), true);
    assert.equal(html.includes('<code>'), true);
    assert.equal(html.includes('<del>'), true);
    assert.equal(html.includes('<mark>'), true);
    assert.equal(html.includes('<u>'), true);

    const state = EditorState.create({ doc: 'abcdef', selection: { anchor: 1, head: 4 } });
    assert.equal(rangeInSelection(state, 0, 2), true);
    assert.equal(rangeInSelection(state, 4, 6), false);
  });

  test('bubble/table runtime helpers: should handle selection and edge-button behavior', () => {
    const state = EditorState.create({ doc: '![alt](https://example.com/a.png)' });
    assert.equal(isImageSelection(state, 0, state.doc.length), true);

    const menuDom = document.createElement('div');
    const panelDom = document.createElement('div');
    document.body.appendChild(menuDom);
    document.body.appendChild(panelDom);
    positionAIPolishPanel(menuDom, panelDom);
    assert.equal(panelDom.style.top.endsWith('px'), true);
    assert.equal(panelDom.style.left.endsWith('px'), true);

    const table = document.createElement('table');
    const row = table.insertRow();
    row.insertCell().textContent = 'A';
    document.body.appendChild(table);

    const edgeButtons = new TableEditorEdgeButtons(30);
    edgeButtons.show();
    assert.equal(edgeButtons.visible, true);

    edgeButtons.reposition({
      table,
      rowIndex: 0,
      cellIndex: 0,
      container: document.body,
    });

    const inside = edgeButtons.shouldDisplayForMouseEvent({
      event: new MouseEvent('mousemove', { clientX: 0, clientY: 0 }),
      table,
      edgeButtonSize: 30,
    });
    assert.equal(typeof inside, 'boolean');

    edgeButtons.hide();
    assert.equal(edgeButtons.visible, false);

    table.remove();
    menuDom.remove();
    panelDom.remove();
  });

  test('image widget helpers: should build widget dom and drag/move payload', () => {
    const { wrapper, img, altText } = createImageWidgetElements({
      alt: 'cover',
      src: 'https://example.com/a.png',
      errorSrc: null,
      isError: false,
    });
    assert.equal(wrapper.classList.contains('cm-image-widget'), true);
    assert.equal(img.alt, 'cover');
    assert.equal(altText.textContent, 'cover');

    applyDraggingVisual(img, 12, -6);
    assert.equal(img.style.transform.includes('translate(12px, -6px)'), true);
    assert.equal(img.style.opacity, '0.7');

    resetDraggingVisual(img);
    assert.equal(img.style.transform, '');
    assert.equal(img.style.opacity, '1');

    const docState = EditorState.create({ doc: 'line1\nline2\n' });
    const changes = buildImageMoveChanges({
      doc: docState.doc,
      pos: 3,
      from: 0,
      to: 5,
      alt: 'cover',
      src: 'https://example.com/a.png',
    });
    assert.equal(changes.length, 2);
    assert.equal(typeof changes[1].insert, 'string');
    assert.equal((changes[1].insert as string).includes('![cover](https://example.com/a.png)'), true);
  });

  test('ai polish prompts: should build deterministic prompts with locale/history', () => {
    assert.equal(resolveAIPolishTargetLanguage('zh-CN'), 'Simplified Chinese');
    assert.equal(resolveAIPolishTargetLanguage('en-US'), 'English');

    const systemPrompt = buildAIPolishSystemPrompt();
    assert.equal(systemPrompt.includes('MARKDOWN PRESERVATION'), true);
    assert.equal(systemPrompt.includes('NO CONVERSATIONAL FILLER'), true);

    const userPrompt = buildAIPolishUserPrompt({
      locale: 'zh-CN',
      selectedText: '这是 **原文**。',
      instruction: '请更简洁一点',
      conversationHistory: [
        { role: 'user', content: '第一次请求' },
        { role: 'assistant', content: '第一次回复' },
      ],
    });

    assert.equal(userPrompt.includes('<target_language>Simplified Chinese</target_language>'), true);
    assert.equal(userPrompt.includes('<source_text>\n这是 **原文**。\n    </source_text>'), true);
    assert.equal(userPrompt.includes('<message role="user">\n第一次请求\n</message>'), true);
    assert.equal(userPrompt.trimEnd().endsWith('Output:'), true);
  });

  test('table model/navigation: should keep mutations and cursor moves deterministic', () => {
    const model = new TableEditorModel(
      [
        ['h1', 'h2'],
        ['r1c1', 'r1c2'],
      ],
      ['left', 'right']
    );

    model.prependColumn(1);
    assert.equal(model.cols, 3);
    assert.equal(model.getCell(0, 1), '');

    model.appendRow(1);
    assert.equal(model.rows, 3);

    model.setCell(2, 1, 'x');
    assert.equal(model.getCell(2, 1), 'x');

    model.updateColumnAlignment(0, 'center');
    assert.equal(model.getColumnAlignment(0), 'center');

    assert.equal(model.removeColumn(2), true);
    assert.equal(model.removeRow(2), true);
    assert.equal(model.rows, 2);

    assert.deepEqual(moveToNextCell({ rowIndex: 0, colIndex: 1 }, 2), { rowIndex: 1, colIndex: 0 });
    assert.deepEqual(moveToPreviousCell({ rowIndex: 1, colIndex: 0 }, 2), { rowIndex: 0, colIndex: 1 });
    assert.equal(moveToPreviousCell({ rowIndex: 0, colIndex: 0 }, 2), null);
    assert.deepEqual(moveToNextRow({ rowIndex: 0, colIndex: 1 }), { rowIndex: 1, colIndex: 1 });
    assert.deepEqual(moveToPreviousRow({ rowIndex: 1, colIndex: 1 }), { rowIndex: 0, colIndex: 1 });
  });

  test('table editor: should preserve active cell input before structural mutations', () => {
    const editor = new TableEditor(
      [
        ['A', 'B'],
        ['1', '2'],
      ],
      ['left', 'left']
    );
    document.body.appendChild(editor.domElement);

    const cell = editor.domElement.rows[1].cells[0] as HTMLTableCellElement;
    cell.focus();
    cell.textContent = 'draft value';
    cell.dispatchEvent(new window.Event('input', { bubbles: true }));

    editor.appendCol(0);

    const markdown = editor.getMarkdownTable();
    assert.equal(markdown.includes('| draft value |  | 2 |'), true);

    editor.destroy();
    editor.domElement.remove();
  });

  test('table parser: should not treat a blank header row as an alignment delimiter', () => {
    const parsed = parseMarkdownTable([
      '|  |  |',
      '|--|--|',
      '| A | B |',
      '| 1 | 2 |',
      '',
    ].join('\n'));

    assert.ok(parsed);
    assert.deepEqual(parsed.colAlignments, ['left', 'left']);

    const model = new TableEditorModel(parsed.ast, parsed.colAlignments);
    assert.equal(model.removeRow(0), true);

    const markdown = buildPipeTable(model.getTableData(), model.getAlignments());
    assert.equal(markdown.includes('--:'), false);
    assert.equal(markdown.includes('| A | B |'), true);
  });

  test('table editor dom helpers: should rebuild dom and select cells safely', () => {
    const table = document.createElement('table');
    document.body.appendChild(table);

    const model = new TableEditorModel(
      [
        ['h1', 'h2'],
        ['r1c1', 'r1c2'],
      ],
      ['left', 'center']
    );

    let focusCalls = 0;
    let blurCalls = 0;
    rebuildEditableTableDom({
      table,
      model,
      onCellFocus: () => {
        focusCalls += 1;
      },
      onCellBlur: () => {
        blurCalls += 1;
      },
    });

    assert.equal(table.rows.length, 2);
    assert.equal(table.rows[0].cells.length, 2);
    assert.equal(table.rows[0].cells[1].style.textAlign, 'center');

    const cell = table.rows[0].cells[0] as HTMLTableCellElement;
    cell.dispatchEvent(new window.Event('focus'));
    cell.dispatchEvent(new window.Event('blur'));
    assert.equal(focusCalls, 1);
    assert.equal(blurCalls, 1);

    assert.equal(
      selectEditableCell({ table, rowIndex: 0, cellIndex: 0, where: 'start' }),
      false
    );

    cell.focus();
    assert.equal(
      selectEditableCell({ table, rowIndex: 0, cellIndex: 0, where: { from: 0, to: 1 } }),
      true
    );

    table.remove();
  });

  test('table save controller: should save correct table in multi-table document', () => {
    const doc = [
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      'middle text',
      '',
      '| C | D |',
      '|---|---|',
      '| 3 | 4 |',
      '',
    ].join('\n');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const state = EditorState.create({
      doc,
      extensions: [
        tablePositions,
        markdown({ extensions: [GFM], addKeymap: false }),
      ],
    });
    const view = new EditorView({ state, parent: host });

    const ranges = collectTableRanges(view.state);
    assert.equal(ranges.length, 2);

    const targetWidgetId = 42;
    const secondTableRange = ranges[1];
    view.dispatch({
      effects: updateTablePosition.of({
        id: targetWidgetId,
        from: secondTableRange.from,
        to: secondTableRange.to,
      }),
    });

    const controller = new TableWidgetSaveController();
    let markCleanCalled = 0;
    const replacement = ['| C | D |', '|---|---|', '| 9 | 9 |', ''].join('\n');
    const fakeEditor = {
      getMarkdownTable: () => replacement,
      markClean: () => {
        markCleanCalled += 1;
      },
    } as any;

    controller.save(view, fakeEditor, {
      widgetId: targetWidgetId,
      originalRange: ranges[0],
      tableDom: document.createElement('table'),
    });

    const nextDoc = view.state.doc.toString();
    assert.equal(nextDoc.includes('| 1 | 2 |'), true);
    assert.equal(nextDoc.includes('| 9 | 9 |'), true);
    assert.equal(markCleanCalled, 1);

    const stored = view.state.field(tablePositions).get(targetWidgetId);
    assert.equal(Boolean(stored), true);
    assert.equal(stored?.from, secondTableRange.from);
    assert.equal((stored?.to ?? 0) > (stored?.from ?? 0), true);

    view.destroy();
    host.remove();
  });

  test('table save controller: should fallback to DOM-located table when original range drifts', () => {
    const doc = ['| X | Y |', '|---|---|', '| a | b |', ''].join('\n');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const state = EditorState.create({
      doc,
      extensions: [
        tablePositions,
        markdown({ extensions: [GFM], addKeymap: false }),
      ],
    });
    const view = new EditorView({ state, parent: host });
    const ranges = collectTableRanges(view.state);
    assert.equal(ranges.length, 1);

    const controller = new TableWidgetSaveController();
    let markCleanCalled = 0;
    const replacement = ['| X | Y |', '|---|---|', '| z | z |', ''].join('\n');
    const fakeEditor = {
      getMarkdownTable: () => replacement,
      markClean: () => {
        markCleanCalled += 1;
      },
    } as any;

    controller.save(view, fakeEditor, {
      widgetId: 7,
      originalRange: { from: 0, to: 1 },
      tableDom: document.createElement('table'),
    });

    assert.equal(view.state.doc.toString().includes('| z | z |'), true);
    assert.equal(markCleanCalled, 1);

    view.destroy();
    host.remove();
  });

  test('table save controller: should ignore re-entrant save while in progress', () => {
    const doc = ['| K | V |', '|---|---|', '| 1 | 2 |', ''].join('\n');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const state = EditorState.create({
      doc,
      extensions: [
        tablePositions,
        markdown({ extensions: [GFM], addKeymap: false }),
      ],
    });
    const view = new EditorView({ state, parent: host });
    const ranges = collectTableRanges(view.state);
    assert.equal(ranges.length, 1);

    const controller = new TableWidgetSaveController();
    const context = {
      widgetId: 11,
      originalRange: ranges[0],
      tableDom: document.createElement('table'),
    };

    let markCleanCalled = 0;
    let reentered = false;
    let dispatchCount = 0;
    const rawDispatch = view.dispatch.bind(view);
    (view as any).dispatch = (spec: any) => {
      dispatchCount += 1;
      return rawDispatch(spec);
    };

    const replacement = ['| K | V |', '|---|---|', '| 8 | 8 |', ''].join('\n');
    const fakeEditor = {
      getMarkdownTable: () => {
        if (!reentered) {
          reentered = true;
          controller.save(view, fakeEditor as any, context);
        }
        return replacement;
      },
      markClean: () => {
        markCleanCalled += 1;
      },
    } as any;

    controller.save(view, fakeEditor, context);

    assert.equal(dispatchCount, 1);
    assert.equal(markCleanCalled, 1);
    assert.equal(view.state.doc.toString().includes('| 8 | 8 |'), true);

    view.destroy();
    host.remove();
  });

  test('table positions: update effect in changed transaction should not be remapped twice', () => {
    const currentState = EditorState.create({
      doc: 'abcdef',
      extensions: [tablePositions],
    });

    const transaction = currentState.update({
      changes: { from: 0, insert: 'X' },
      effects: updateTablePosition.of({ id: 1, from: 3, to: 6 }),
    });
    const nextState = transaction.state;

    const stored = nextState.field(tablePositions).get(1);
    assert.equal(stored?.from, 3);
    assert.equal(stored?.to, 6);
  });
});
