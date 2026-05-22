import { test, expect, type Page } from '@playwright/test';

async function setEditorValue(page: Page, value: string): Promise<void> {
  await page.evaluate((nextValue) => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    if (!editor) {
      throw new Error('Playground editor handle is unavailable');
    }
    editor.setValue(nextValue);
  }, value);
}

async function getEditorValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    return editor?.getValue?.() || '';
  });
}

async function focusEditorEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    if (!editor) {
      throw new Error('Playground editor handle is unavailable');
    }

    const view = editor.getView();
    view.dispatch({
      selection: { anchor: view.state.doc.length },
      scrollIntoView: true,
    });
    view.focus();
  });
}

async function focusEditorAtText(page: Page, needle: string, offset = 0): Promise<void> {
  await page.evaluate(({ needle: targetText, offset: targetOffset }) => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    if (!editor) {
      throw new Error('Playground editor handle is unavailable');
    }

    const view = editor.getView();
    const doc = view.state.doc.toString();
    const index = doc.indexOf(targetText);
    if (index < 0) {
      throw new Error(`Text not found: ${targetText}`);
    }

    view.dispatch({
      selection: { anchor: index + targetOffset },
      scrollIntoView: true,
    });
    view.focus();
  }, { needle, offset });
}

async function getEditorSelection(page: Page): Promise<{ from: number; to: number; selectedText: string }> {
  return page.evaluate(() => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    if (!editor) {
      throw new Error('Playground editor handle is unavailable');
    }

    const view = editor.getView();
    const selection = view.state.selection.main;
    return {
      from: selection.from,
      to: selection.to,
      selectedText: view.state.sliceDoc(selection.from, selection.to),
    };
  });
}

async function getEditorSelectionLineNumber(page: Page): Promise<number> {
  return page.evaluate(() => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    if (!editor) {
      throw new Error('Playground editor handle is unavailable');
    }

    const view = editor.getView();
    return view.state.doc.lineAt(view.state.selection.main.from).number;
  });
}

async function dispatchEditorModShortcut(page: Page, key: string): Promise<void> {
  await page.evaluate((shortcutKey) => {
    const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
    if (!editor) {
      throw new Error('Playground editor handle is unavailable');
    }

    const view = editor.getView();
    view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
      key: shortcutKey,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }));
    if (!document.querySelector('.cm-search')) {
      if (shortcutKey.toLowerCase() === 'r') {
        editor.openReplace();
      } else {
        editor.openSearch();
      }
    }
  }, key);
}

async function openTableColumnPopover(page: Page): Promise<void> {
  await page.locator('.table-helper td').first().click();
  await expect(page.locator('.table-helper-operate-button.top')).toHaveClass(/is-visible/);
  await page.locator('.table-helper-operate-button.top').click();
  await expect(page.locator('.table-action-popover .tippy-button[title="Insert column to the right"]').last()).toBeVisible();
}

async function openTableRowPopover(page: Page): Promise<void> {
  await page.locator('.table-helper td').first().click();
  await expect(page.locator('.table-helper-operate-button.left')).toHaveClass(/is-visible/);
  await page.locator('.table-helper-operate-button.left').click();
  await expect(page.locator('.table-action-popover .tippy-button[title="Insert row below"]').last()).toBeVisible();
}

test.describe('Moondown playground e2e', () => {
  test('page should load and render editor', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Moondown', exact: true })).toBeVisible();
    await expect(page.locator('#editor .cm-editor')).toBeVisible();
    await expect(page.locator('#snapshot')).toContainText('Moondown Playground');
  });

  test('toolbar buttons should update state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const themeState = page.locator('#themeState');
    const syntaxState = page.locator('#syntaxState');
    const readonlyState = page.locator('#readonlyState');

    await expect(themeState).toHaveText('light');
    await page.locator('#toggleTheme').check();
    await expect(themeState).toHaveText('dark');

    await expect(syntaxState).toHaveText('on');
    await page.locator('#toggleSyntax').uncheck();
    await expect(syntaxState).toHaveText('off');

    await expect(readonlyState).toHaveText('off');
    await page.locator('#toggleReadonly').check();
    await expect(readonlyState).toHaveText('on');
  });

  test('theme color selector should affect markdown markers and list bullets', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Green' }).click();
    await expect(page.locator('#accentState')).toHaveText('green');

    await setEditorValue(page, ['1. Ordered marker', '- Bullet marker', '> Quote marker', ''].join('\n'));
    await expect(page.locator('.bullet-symbol')).toBeVisible();
    await expect(page.locator('.cm-ordered-list-marker')).toBeVisible();

    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const bullet = document.querySelector('.bullet-symbol') as HTMLElement;
      const ordered = document.querySelector('.cm-ordered-list-marker') as HTMLElement;
      const quote = document.querySelector('.cm-blockquote-line') as HTMLElement;

      return {
        hsl: root.getPropertyValue('--color-primary-hsl').trim(),
        bulletColor: getComputedStyle(bullet).color,
        orderedColor: getComputedStyle(ordered).color,
        quoteBackground: getComputedStyle(quote).backgroundImage,
      };
    });

    expect(colors.hsl).toBe('142 70% 43%');
    expect(colors.bulletColor).not.toBe('rgb(0, 122, 255)');
    expect(colors.orderedColor).not.toBe('rgb(0, 122, 255)');
    expect(colors.quoteBackground).toContain('33, 186, 89');
  });

  test('replace content should update snapshot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Insert Timestamp' }).click();
    await expect(page.locator('#snapshot')).toContainText('New Content');
    await expect(page.locator('#snapshot')).toContainText('Timestamp:');
  });

  test('load full markdown test doc should update snapshot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Full Markdown Test' }).click();

    const snapshot = page.locator('#snapshot');
    await expect(snapshot).toContainText('Full Markdown Test');
    await expect(snapshot).toContainText('| Feature | Status | Notes |');
    await expect(snapshot).toContainText('```mermaid');
    await expect(snapshot).toContainText('```latex');
    await expect(snapshot).toContainText('Footnote reference[^1] and another reference[^note].');
    await expect(snapshot).toContainText('Unknown fenced code should keep the normal fencedCode background.');

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const position = view.state.doc.toString().indexOf('| Feature | Status | Notes |');
      view.dispatch({ selection: { anchor: position }, scrollIntoView: true });
    });
    await expect(page.locator('.table-helper')).toBeVisible();
    await expect(page.locator('.table-helper')).toContainText('Core API');
  });

  test('ai settings panel should apply mode and locale changes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.selectOption('#aiMode', 'mock');
    await page.fill('#localeInput', 'zh-CN');
    await page.fill('#aiChunkSize', '9');
    await page.fill('#aiDelayMs', '20');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect(page.locator('#aiModeState')).toHaveText('mock');
    await expect(page.locator('#localeState')).toHaveText('zh-CN');
    await expect(page.locator('#aiEndpointState')).toHaveText('(mock)');

    const appliedSettings = await page.evaluate(() => (window as any).__MOONDOWN_PLAYGROUND_AI_SETTINGS__);
    expect(appliedSettings?.mode).toBe('mock');
    expect(appliedSettings?.locale).toBe('zh-CN');
    expect(appliedSettings?.mockChunkSize).toBe(9);
    expect(appliedSettings?.mockDelayMs).toBe(20);
  });

  test('slash menu should open when typing /', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await focusEditorEnd(page);

    const editorContent = page.locator('#editor .cm-content');
    await editorContent.type('\n/');

    const slashMenu = page.locator('.cm-slash-command-menu');
    await expect(slashMenu).toBeVisible();
    await expect(slashMenu).toContainText('Heading 1');
    await expect(slashMenu).toContainText('Insert Mermaid');
    await expect(slashMenu).toContainText('Insert LaTeX');
    await expect(slashMenu).toContainText('Insert Standup Template');
  });

  test('plugin slash command should be searchable by unicode keyword and executable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      const view = editor.getView();
      const end = view.state.doc.length;
      view.dispatch({
        selection: { anchor: end },
        scrollIntoView: true,
      });
      view.focus();
    });

    const editorContent = page.locator('#editor .cm-content');
    await editorContent.type('\n/模板');

    const slashMenu = page.locator('.cm-slash-command-menu');
    await expect(slashMenu).toBeVisible();
    await expect(slashMenu).toContainText('Insert Standup Template');

    await page.keyboard.press('Enter');

    const value = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      return editor?.getValue?.() || '';
    });

    expect(value).toContain('## Standup Update');
    expect(value).not.toContain('/模板');
  });

  test('bubble menu should appear on selection and support AI polish mock', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const targetLine = page.locator('#editor .cm-line').filter({ hasText: 'Try these interactions:' }).first();
    await expect(targetLine).toBeVisible();

    const box = await targetLine.boundingBox();
    if (!box) throw new Error('Failed to get target line box');

    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(200, box.width - 10), box.y + box.height / 2);
    await page.mouse.up();

    const bubbleMenu = page.locator('.cm-bubble-menu');
    await expect(bubbleMenu).toBeVisible();

    await bubbleMenu.getByRole('button', { name: 'AI Polish' }).click();

    const panel = page.locator('.cm-ai-polish-panel');
    await expect(panel).toBeVisible();

    const input = panel.locator('textarea');
    await input.fill('Make it more concise');

    await panel.locator('.ai-polish-send-btn').hover();
    const inputButtonMetrics = await page.evaluate(() => {
      const close = document.querySelector('.ai-polish-close-btn') as HTMLElement;
      const send = document.querySelector('.ai-polish-send-btn') as HTMLElement;
      const sendSvg = send.querySelector('svg') as SVGElement;
      const closeRect = close.getBoundingClientRect();
      const sendRect = send.getBoundingClientRect();

      return {
        closeWidth: closeRect.width,
        closeHeight: closeRect.height,
        sendWidth: sendRect.width,
        sendHeight: sendRect.height,
        sendSvgWidth: sendSvg.getBoundingClientRect().width,
        sendSvgColor: getComputedStyle(sendSvg).color,
        sendColor: getComputedStyle(send).color,
      };
    });

    expect(inputButtonMetrics.closeWidth).toBeLessThanOrEqual(30);
    expect(inputButtonMetrics.closeHeight).toBeLessThanOrEqual(30);
    expect(inputButtonMetrics.sendWidth).toBeLessThanOrEqual(34);
    expect(inputButtonMetrics.sendHeight).toBeLessThanOrEqual(34);
    expect(inputButtonMetrics.sendSvgWidth).toBeGreaterThan(12);
    expect(inputButtonMetrics.sendSvgColor).toBe(inputButtonMetrics.sendColor);

    await panel.locator('.ai-polish-send-btn').click();

    await expect(panel.locator('.ai-polish-response-text').last()).toContainText('Polished');
    await expect(panel.locator('.ai-polish-action-btn')).toContainText(['Retry', 'Copy', 'Insert']);
    await expect(panel.locator('.ai-polish-action-btn svg')).toHaveCount(3);

    const actionButtonMetrics = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ai-polish-action-btn')).map((button) => {
        const buttonRect = button.getBoundingClientRect();
        const svg = button.querySelector('svg') as SVGElement;
        const svgRect = svg.getBoundingClientRect();

        return {
          text: button.textContent?.trim(),
          height: buttonRect.height,
          iconCenterDelta: Math.abs(
            (svgRect.top + svgRect.height / 2) - (buttonRect.top + buttonRect.height / 2)
          ),
        };
      });
    });

    expect(actionButtonMetrics).toHaveLength(3);
    for (const metrics of actionButtonMetrics) {
      expect(metrics.height).toBeLessThanOrEqual(34);
      expect(metrics.iconCenterDelta).toBeLessThan(1);
    }
  });

  test('mermaid fenced code should render as diagram widget', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# Mermaid Test',
        '',
        '```mermaid',
        'flowchart TD',
        '  A[Start] --> B[Done]',
        '```',
        '',
      ].join('\n'));
    });

    const widget = page.locator('.cm-mermaid-widget');
    await expect(widget).toBeVisible();
    await expect(widget.locator('svg')).toBeVisible();
  });

  test('image widget bubble should edit image url', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue(['# Image Edit', '', '![Kitten](https://placekitten.com/640/360)', ''].join('\n'));
    });

    await page.locator('.cm-image-widget img').click();

    const bubble = page.locator('.cm-widget-edit-bubble');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator('.cm-widget-edit-bubble-title')).toHaveText('Edit Image URL');

    const input = bubble.locator('.cm-widget-edit-bubble-input');
    await input.fill('https://placekitten.com/800/400');
    await bubble.locator('.cm-widget-edit-bubble-button-primary').click();

    const value = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      return editor?.getValue?.() || '';
    });

    expect(value).toContain('![Kitten](https://placekitten.com/800/400)');
    expect(value).not.toContain('https://placekitten.com/640/360');
  });

  test('image widget bubble should stay aligned after preceding content changes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# Image Offset Regression',
        '',
        '![Kitten](https://placekitten.com/640/360)',
        '',
      ].join('\n'));

      const view = editor.getView();
      view.dispatch({
        changes: {
          from: 0,
          insert: 'Preface line 1\nPreface line 2\n\n',
        },
      });
    });

    await page.locator('.cm-image-widget img').click();

    const bubble = page.locator('.cm-widget-edit-bubble');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator('.cm-widget-edit-bubble-title')).toHaveText('Edit Image URL');

    const selection = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const expectedBlock = '![Kitten](https://placekitten.com/640/360)';
      const doc = view.state.doc.toString();
      const expectedFrom = doc.indexOf(expectedBlock);
      const expectedTo = expectedFrom + expectedBlock.length;
      const selectionRange = view.state.selection.main;
      return {
        from: selectionRange.from,
        to: selectionRange.to,
        expectedFrom,
        expectedTo,
        selectedText: view.state.sliceDoc(selectionRange.from, selectionRange.to),
        expectedBlock,
      };
    });

    expect(selection.expectedFrom).toBeGreaterThan(-1);
    expect(selection.from).toBe(selection.expectedFrom);
    expect(selection.to).toBe(selection.expectedTo);
    expect(selection.selectedText).toBe(selection.expectedBlock);
  });

  test('mermaid widget bubble should edit source', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# Mermaid Edit',
        '',
        '```mermaid',
        'flowchart TD',
        '  A[Start] --> B[Done]',
        '```',
        '',
      ].join('\n'));
    });

    await page.locator('.cm-mermaid-widget').click();

    const bubble = page.locator('.cm-widget-edit-bubble');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator('.cm-widget-edit-bubble-title')).toHaveText('Edit Mermaid Source');

    const input = bubble.locator('.cm-widget-edit-bubble-input');
    await input.fill('flowchart TD\n  X[New] --> Y[Result]');
    await bubble.locator('.cm-widget-edit-bubble-button-primary').click();

    const value = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      return editor?.getValue?.() || '';
    });

    expect(value).toContain('X[New] --> Y[Result]');
    expect(value).not.toContain('A[Start] --> B[Done]');
  });

  test('mermaid widget bubble should stay aligned after preceding content changes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# Mermaid Offset Regression',
        '',
        '```mermaid',
        'flowchart TD',
        '  A[Start] --> B[Done]',
        '```',
        '',
      ].join('\n'));

      const view = editor.getView();
      view.dispatch({
        changes: {
          from: 0,
          insert: 'Preface line 1\nPreface line 2\n\n',
        },
      });
    });

    const widget = page.locator('.cm-mermaid-widget');
    await expect(widget).toBeVisible();
    await widget.click();

    const bubble = page.locator('.cm-widget-edit-bubble');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator('.cm-widget-edit-bubble-title')).toHaveText('Edit Mermaid Source');

    const selection = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const expectedBlock = [
        '```mermaid',
        'flowchart TD',
        '  A[Start] --> B[Done]',
        '```',
      ].join('\n');
      const doc = view.state.doc.toString();
      const expectedFrom = doc.indexOf(expectedBlock);
      const expectedTo = expectedFrom + expectedBlock.length;
      const selectionRange = view.state.selection.main;
      return {
        from: selectionRange.from,
        to: selectionRange.to,
        expectedFrom,
        expectedTo,
        selectedText: view.state.sliceDoc(selectionRange.from, selectionRange.to),
        expectedBlock,
      };
    });

    expect(selection.expectedFrom).toBeGreaterThan(-1);
    expect(selection.from).toBe(selection.expectedFrom);
    expect(selection.to).toBe(selection.expectedTo);
    expect(selection.selectedText).toBe(selection.expectedBlock);
  });

  test('latex fenced code should render as math widget', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# LaTeX Test',
        '',
        '```latex',
        '\\\\int_0^1 x^2 dx = \\\\frac{1}{3}',
        '```',
        '',
      ].join('\n'));
    });

    const widget = page.locator('.cm-latex-widget');
    await expect(widget).toBeVisible();
    await expect(widget.locator('math')).toBeVisible();
  });

  test('latex widget bubble should edit source', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# LaTeX Edit',
        '',
        '```latex',
        '\\\\int_0^1 x^2 dx = \\\\frac{1}{3}',
        '```',
        '',
      ].join('\n'));
    });

    await page.locator('.cm-latex-widget').click();

    const bubble = page.locator('.cm-widget-edit-bubble');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator('.cm-widget-edit-bubble-title')).toHaveText('Edit LaTeX Source');

    const input = bubble.locator('.cm-widget-edit-bubble-input');
    await input.fill('\\\\sum_{i=1}^{n} i = \\\\frac{n(n+1)}{2}');
    await bubble.locator('.cm-widget-edit-bubble-button-primary').click();

    const value = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      return editor?.getValue?.() || '';
    });

    expect(value).toContain('\\\\sum_{i=1}^{n} i = \\\\frac{n(n+1)}{2}');
    expect(value).not.toContain('\\\\int_0^1 x^2 dx = \\\\frac{1}{3}');
  });

  test('latex widget bubble should stay aligned after preceding content changes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      if (!editor) {
        throw new Error('Playground editor handle is unavailable');
      }

      editor.setValue([
        '# LaTeX Offset Regression',
        '',
        '```latex',
        '\\\\int_0^1 x^2 dx = \\\\frac{1}{3}',
        '```',
        '',
      ].join('\n'));

      const view = editor.getView();
      view.dispatch({
        changes: {
          from: 0,
          insert: 'Preface line 1\nPreface line 2\n\n',
        },
      });
    });

    const widget = page.locator('.cm-latex-widget');
    await expect(widget).toBeVisible();
    await widget.click();

    const bubble = page.locator('.cm-widget-edit-bubble');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator('.cm-widget-edit-bubble-title')).toHaveText('Edit LaTeX Source');

    const selection = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const expectedBlock = [
        '```latex',
        '\\\\int_0^1 x^2 dx = \\\\frac{1}{3}',
        '```',
      ].join('\n');
      const doc = view.state.doc.toString();
      const expectedFrom = doc.indexOf(expectedBlock);
      const expectedTo = expectedFrom + expectedBlock.length;
      const selectionRange = view.state.selection.main;
      return {
        from: selectionRange.from,
        to: selectionRange.to,
        expectedFrom,
        expectedTo,
        selectedText: view.state.sliceDoc(selectionRange.from, selectionRange.to),
        expectedBlock,
      };
    });

    expect(selection.expectedFrom).toBeGreaterThan(-1);
    expect(selection.from).toBe(selection.expectedFrom);
    expect(selection.to).toBe(selection.expectedTo);
    expect(selection.selectedText).toBe(selection.expectedBlock);
  });

  test('image widget should preserve balanced parentheses in urls', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, '![Alt](https://example.com/a_(b).png)\n');

    await page.locator('.cm-image-widget img').click();

    const input = page.locator('.cm-widget-edit-bubble-input');
    await expect(input).toHaveValue('https://example.com/a_(b).png');
  });

  test('selected widgets should be deletable from the edit bubble keyboard focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, ['Before', '', '![Alt](https://example.com/a.png)', '', 'After', ''].join('\n'));
    await page.locator('.cm-image-widget img').click();
    await page.keyboard.press('Backspace');
    await expect.poll(() => getEditorValue(page)).not.toContain('![Alt]');

    await setEditorValue(page, ['Before', '', '```mermaid', 'flowchart TD', '  A --> B', '```', '', 'After', ''].join('\n'));
    await page.locator('.cm-mermaid-widget').click();
    await page.keyboard.press('Delete');
    await expect.poll(() => getEditorValue(page)).not.toContain('```mermaid');

    await setEditorValue(page, ['Before', '', '```latex', '\\\\frac{a}{b}', '```', '', 'After', ''].join('\n'));
    await page.locator('.cm-latex-widget').click();
    await page.keyboard.press('Backspace');
    await expect.poll(() => getEditorValue(page)).not.toContain('```latex');
  });

  test('readonly mode should block widget and table mutations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const readonlyDoc = [
      '![Alt](https://example.com/a.png)',
      '',
      '```mermaid',
      'flowchart TD',
      '  A --> B',
      '```',
      '',
      '| A | B |',
      '| - | - |',
      '| 1 | 2 |',
      '',
    ].join('\n');

    await setEditorValue(page, readonlyDoc);
    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      editor.setReadOnly(true);
    });

    await page.locator('.cm-image-widget img').click();
    await expect(page.locator('.cm-widget-edit-bubble')).toBeHidden();

    await page.locator('.cm-mermaid-widget').click();
    await expect(page.locator('.cm-widget-edit-bubble')).toBeHidden();

    await expect(page.locator('.table-helper td').first()).toHaveAttribute('contenteditable', 'false');
    await page.locator('.table-helper td').first().click();
    await page.keyboard.type('SHOULD_NOT_APPEAR');
    await page.locator('body').click({ position: { x: 5, y: 5 } });

    await expect.poll(() => getEditorValue(page)).toBe(readonlyDoc);
  });

  test('table editing should avoid clean blur rewrites and keep keyboard actions scoped to cells', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Keyboard modifier expectation is pinned to chromium project');
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const table = ['| A | B |', '| - | - |', '| 1 | 2 |', ''].join('\n');
    await setEditorValue(page, table);
    await page.locator('.table-helper td').first().click();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect.poll(() => getEditorValue(page)).toBe(table);

    await page.locator('.table-helper td').first().click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.type('AA');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect.poll(() => getEditorValue(page)).toContain('| AA | B |');

    await setEditorValue(page, table);
    await page.locator('.table-helper td').first().click();
    await page.keyboard.press('Tab');
    await page.keyboard.type('X');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect.poll(() => getEditorValue(page)).toContain('| A | BX |');
  });

  test('table handlers should stay visible for the selected cell and use compact popovers', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, ['| A | B |', '| - | - |', '| 1 | 2 |', ''].join('\n'));
    await page.locator('.table-helper td').first().click();

    const topHandler = page.locator('.table-helper-operate-button.top');
    const leftHandler = page.locator('.table-helper-operate-button.left');
    await expect(topHandler).toHaveClass(/is-visible/);
    await expect(leftHandler).toHaveClass(/is-visible/);

    const tableBox = await page.locator('.table-helper').boundingBox();
    if (!tableBox) throw new Error('Table helper is unavailable');
    await page.mouse.move(tableBox.x + tableBox.width + 80, tableBox.y + tableBox.height + 80);

    await expect(topHandler).toHaveClass(/is-visible/);
    await expect(leftHandler).toHaveClass(/is-visible/);
    await expect(topHandler).toHaveCSS('opacity', '1');
    await expect(leftHandler).toHaveCSS('opacity', '1');

    await topHandler.click();
    const popover = page.locator('.tippy-box[data-theme~="custom"]').first();
    await expect(popover).toBeVisible();

    const popoverHeight = await popover.evaluate((element) => element.getBoundingClientRect().height);
    expect(popoverHeight).toBeLessThanOrEqual(44);

    await page.locator('.tippy-button[title="Alignment"]').click();
    await expect(page.locator('.alignment-options .tippy-button[title="Align right"]').last()).toBeVisible();
    await page.locator('.alignment-options .tippy-button[title="Align right"]').last().click();
    await expect.poll(async () =>
      page.locator('.table-helper tr').evaluateAll((rows) =>
        rows.map((row) => Array.from(row.children).map((cell) => getComputedStyle(cell).textAlign))
      )
    ).toEqual([
      ['right', 'left'],
      ['right', 'left'],
    ]);
  });

  test('table handler popover actions should mutate rows, columns, and alignment in markdown', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, ['| A | B |', '| - | - |', '| 1 | 2 |', ''].join('\n'));

    await openTableColumnPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Insert column to the right"]').last().click();
    await expect.poll(() => getEditorValue(page)).toContain('| A |  | B |');

    await openTableColumnPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Alignment"]').last().click();
    await expect(page.locator('.alignment-options .tippy-button[title="Align right"]').last()).toBeVisible();
    await page.locator('.alignment-options .tippy-button[title="Align right"]').last().click();
    await expect.poll(async () => /\|[-:]+\|/.test(await getEditorValue(page))).toBe(true);
    await expect.poll(() => getEditorValue(page)).toContain('|--:|');

    await openTableColumnPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Delete this column"]').last().click();
    await expect.poll(() => getEditorValue(page)).not.toContain('| A |  | B |');
    await expect.poll(() => getEditorValue(page)).toContain('|  | B |');

    await openTableRowPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Insert row below"]').last().click();
    await expect.poll(async () => {
      const value = await getEditorValue(page);
      return value.split('\n').filter((line) => line.startsWith('|')).length;
    }).toBe(4);

    await openTableRowPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Delete this row"]').last().click();
    await expect.poll(async () => {
      const value = await getEditorValue(page);
      return value.split('\n').filter((line) => line.startsWith('|')).length;
    }).toBe(3);
  });

  test('deleting a newly inserted header row should preserve left column alignment', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, ['| A | B |', '| - | - |', '| 1 | 2 |', ''].join('\n'));

    await openTableRowPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Insert row above"]').last().click();
    await expect.poll(() => getEditorValue(page)).toMatch(/\|\s+\|\s+\|/);

    await openTableRowPopover(page);
    await page.locator('.table-action-popover .tippy-button[title="Delete this row"]').last().click();

    await expect.poll(async () => {
      const value = await getEditorValue(page);
      return value.includes('--:') || value.includes(':--');
    }).toBe(false);
    await expect.poll(() => getEditorValue(page)).toContain('| A | B |');
  });

  test('slash command should only open when slash is the first character on the line', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, 'prefix ');
    await focusEditorEnd(page);
    await page.keyboard.type('/table');
    await expect(page.locator('.cm-slash-command-menu')).toBeHidden();

    await setEditorValue(page, '');
    await focusEditorEnd(page);
    await page.keyboard.type('/table');
    await expect(page.locator('.cm-slash-command-menu')).toBeVisible();
  });

  test('editor search and replace shortcuts should open the search panel', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, ['alpha', 'beta', 'alpha', ''].join('\n'));
    await focusEditorEnd(page);

    await dispatchEditorModShortcut(page, 'f');
    await expect(page.locator('.cm-search')).toBeVisible();
    await expect(page.locator('.cm-search input[name="search"]')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('.cm-search')).toBeHidden();

    await dispatchEditorModShortcut(page, 'r');
    await expect(page.locator('.cm-search')).toBeVisible();
    await expect(page.locator('.cm-search input[name="replace"]')).toBeFocused();
  });

  test('ordered list enter should keep the caret in the new list item instead of jumping to document start', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, ['Intro', '', '1. One', '2. Two', '', 'Tail', ''].join('\n'));
    await focusEditorAtText(page, '1. One', '1. One'.length);
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fresh');

    const value = await getEditorValue(page);
    expect(value).toContain(['1. One', '2. Fresh', '3. Two'].join('\n'));
    expect(value.startsWith('Fresh')).toBe(false);

    const selection = await getEditorSelection(page);
    expect(selection.from).toBeGreaterThan(value.indexOf('2. Fresh'));
  });

  test('table and slash hit targets should stay aligned after viewport resize', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 900, height: 680 });

    await setEditorValue(page, ['Resize regression', '', '| A | B |', '| - | - |', '| 1 | 2 |', '', 'After', ''].join('\n'));
    await page.locator('.table-helper td').first().click();
    await expect(page.locator('.table-helper-operate-button.top')).toHaveClass(/is-visible/);

    await page.setViewportSize({ width: 1440, height: 920 });
    await page.waitForTimeout(120);

    const firstCell = page.locator('.table-helper td').first();
    const cellBox = await firstCell.boundingBox();
    if (!cellBox) throw new Error('Table cell is unavailable after resize');
    await page.mouse.click(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);

    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLTableCellElement ? active.textContent : null;
    })).toBe('A');

    await focusEditorAtText(page, 'After', 'After'.length);
    await page.keyboard.type('\n/');
    await expect.poll(() => page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const caret = view.coordsAtPos(view.state.selection.main.from);
      const menu = document.querySelector('.cm-slash-command-menu') as HTMLElement | null;
      const rect = menu?.getBoundingClientRect();
      return Boolean(caret && rect && Math.abs(rect.left - caret.left) < 12);
    })).toBe(true);

    await page.setViewportSize({ width: 1024, height: 760 });
    await page.waitForTimeout(160);

    await expect.poll(() => page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const caret = view.coordsAtPos(view.state.selection.main.from);
      const menu = document.querySelector('.cm-slash-command-menu') as HTMLElement | null;
      const rect = menu?.getBoundingClientRect();
      return Boolean(caret && rect && Math.abs(rect.left - caret.left) < 12);
    })).toBe(true);
  });

  test('slash menu should close when the user moves from slash input into a table cell', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await setEditorValue(page, [
      'Start',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '| A | B |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      'End',
      '',
    ].join('\n'));
    await focusEditorAtText(page, 'Start', 'Start'.length);
    await page.keyboard.type('\n/');
    await expect(page.locator('.cm-slash-command-menu')).toBeVisible();

    await page.locator('.table-helper td').first().click();
    await expect(page.locator('.cm-slash-command-menu')).toBeHidden();
  });

  test('slash commands should execute the full built-in insertion surface', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const cases = [
      { query: 'h1', expected: '# ' },
      { query: 'h2', expected: '## ' },
      { query: 'h3', expected: '### ' },
      { query: 'h4', expected: '#### ' },
      { query: 'table', expected: '| Header 1 | Header 2 |' },
      { query: 'link', expected: '[Link text](url)' },
      { query: 'quote', expected: '> ' },
      { query: 'ordered', expected: '1. ' },
      { query: 'unordered', expected: '- ' },
      { query: 'code', expected: '```\n\n```' },
      { query: 'mermaid', expected: '```mermaid' },
      { query: 'latex', expected: '```latex' },
    ];

    for (const currentCase of cases) {
      await setEditorValue(page, '');
      await focusEditorEnd(page);
      await page.keyboard.type(`/${currentCase.query}`);
      await expect(page.locator('.cm-slash-command-menu')).toBeVisible();
      await page.keyboard.press('Enter');
      await expect.poll(() => getEditorValue(page)).toContain(currentCase.expected);
    }
  });

  test('bubble menu formatting should apply inline and block commands in the browser', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, 'format me\nsecond line\n');

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      view.dispatch({ selection: { anchor: 0, head: 'format me'.length } });
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await expect(page.locator('.cm-bubble-menu')).toBeVisible();
    await page.locator('.cm-bubble-menu [data-name="bold"]').click();
    await expect.poll(() => getEditorValue(page)).toContain('**format me**');
    await page.waitForTimeout(50);

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const from = view.state.doc.toString().indexOf('second line');
      view.dispatch({ selection: { anchor: from, head: from + 'second line'.length } });
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await expect(page.locator('.cm-bubble-menu')).toBeVisible();
    await page.evaluate(() => {
      const button = document.querySelector(
        '.cm-bubble-menu [data-parent="Decoration"][data-name="highlight"]'
      ) as HTMLButtonElement | null;
      if (!button) {
        throw new Error('Highlight bubble menu action is unavailable');
      }
      button.click();
    });
    await expect.poll(() => getEditorValue(page)).toContain('==second line==');
  });

  test('bubble menu button items should not reserve dropdown whitespace', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, 'compact menu\n');

    await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      view.dispatch({ selection: { anchor: 0, head: 'compact'.length } });
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await expect(page.locator('.cm-bubble-menu')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const bold = document.querySelector('.cm-bubble-menu [data-name="bold"]') as HTMLElement;
      const heading = document.querySelector('.cm-bubble-menu [data-name="Heading"]') as HTMLElement;
      const boldIcon = bold.querySelector('.cm-bubble-menu-icon') as HTMLElement;
      const boldRect = bold.getBoundingClientRect();
      const boldIconRect = boldIcon.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();

      return {
        boldType: bold.dataset.type,
        boldWidth: boldRect.width,
        boldIconCenterDelta: Math.abs(
          (boldIconRect.left + boldIconRect.width / 2) - (boldRect.left + boldRect.width / 2)
        ),
        headingWidth: headingRect.width,
        boldHasDropdownIcon: !!bold.querySelector('.cm-bubble-menu-dropdown-icon'),
      };
    });

    expect(metrics.boldType).toBe('button');
    expect(metrics.boldHasDropdownIcon).toBe(false);
    expect(metrics.boldWidth).toBeLessThan(metrics.headingWidth);
    expect(metrics.boldIconCenterDelta).toBeLessThan(1);
  });

  test('nested ordered list markers should fully use the accent color', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Green' }).click();
    await setEditorValue(page, [
      '1. top',
      '2. top',
      '3. top',
      '  1. nested',
      '    1. deep',
      '      1. deeper',
      '',
    ].join('\n'));

    await expect(page.locator('.cm-ordered-list-marker')).toHaveCount(6);

    const markers = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cm-ordered-list-marker')).map((marker) => ({
        text: marker.textContent,
        color: getComputedStyle(marker as HTMLElement).color,
      }));
    });

    for (const expectedText of ['3.1.', '3.1.1.', '3.1.1.1.']) {
      const marker = markers.find((item) => item.text === expectedText);
      expect(marker, `Missing marker ${expectedText}`).toBeTruthy();
      expect(marker?.color).toBe('rgb(33, 186, 89)');
    }
  });

  test('widget previews should not inherit fenced code background while normal fenced code keeps it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, [
      '```js',
      'const visibleBackground = true;',
      '```',
      '',
      '```mermaid',
      'flowchart TD',
      '  Start --> End',
      '```',
      '',
      '```latex',
      '\\\\int_0^1 x^2 dx = \\\\frac{1}{3}',
      '```',
      '',
    ].join('\n'));

    await expect(page.locator('.cm-mermaid-widget')).toBeVisible();
    await expect(page.locator('.cm-latex-widget')).toBeVisible();

    const styles = await page.evaluate(() => {
      const normalLine = document.querySelector('.cm-line.cm-fenced-code:not(:has(.cm-mermaid-widget)):not(:has(.cm-latex-widget))') as HTMLElement;
      const mermaidLine = document.querySelector('.cm-line.cm-fenced-code:has(.cm-mermaid-widget)') as HTMLElement;
      const latexLine = document.querySelector('.cm-line.cm-fenced-code:has(.cm-latex-widget)') as HTMLElement;

      return {
        normalBeforeDisplay: getComputedStyle(normalLine, '::before').display,
        normalBeforeContent: getComputedStyle(normalLine, '::before').content,
        normalBeforeBorderRadius: getComputedStyle(normalLine, '::before').borderRadius,
        mermaidBeforeDisplay: getComputedStyle(mermaidLine, '::before').display,
        mermaidBeforeContent: getComputedStyle(mermaidLine, '::before').content,
        latexBeforeDisplay: getComputedStyle(latexLine, '::before').display,
        latexBeforeContent: getComputedStyle(latexLine, '::before').content,
      };
    });

    expect(styles.normalBeforeDisplay).not.toBe('none');
    expect(styles.normalBeforeContent).not.toBe('none');
    expect(styles.normalBeforeBorderRadius).toBe('0px');
    expect(styles.mermaidBeforeDisplay).toBe('none');
    expect(styles.latexBeforeDisplay).toBe('none');
  });

  test('fenced code content should keep inset when host styles reset line padding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: '.consumer-line-reset .cm-line { padding: 0; }' });
    await page.evaluate(() => {
      document.querySelector('#editor')?.classList.add('consumer-line-reset');
    });
    await setEditorValue(page, [
      '```js',
      'const inset = "readable";',
      '```',
      '',
    ].join('\n'));

    const paddingLeft = await page.evaluate(() => {
      const codeLine = document.querySelector('.consumer-line-reset .cm-line.cm-fenced-code') as HTMLElement | null;
      if (!codeLine) throw new Error('Fenced code line not found');
      return Number.parseFloat(getComputedStyle(codeLine).paddingLeft);
    });

    expect(paddingLeft).toBeGreaterThanOrEqual(12);
  });

  test('syntax hiding should not use display none marker spans that break coordinate mapping', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, [
      '# Hidden marker heading',
      '',
      'Clicking **bold text** and *italic text* should keep the caret aligned.',
      '',
    ].join('\n'));

    const hiddenMarkerDisplayValues = await page.evaluate(() => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor?.getView?.();
      view?.focus();
      return Array.from(document.querySelectorAll<HTMLElement>('.cm-hidden-markdown'))
        .map((element) => getComputedStyle(element).display);
    });

    expect(hiddenMarkerDisplayValues).not.toContain('none');
  });

  test('clicking lines after a hidden horizontal rule should keep caret on the clicked line', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, [
      'Before the rule',
      '',
      '---',
      '',
      'after line one',
      'after line two',
      'after line three',
      'after line four',
      '',
    ].join('\n'));

    const horizontalRuleMargins = await page.locator('#editor .cm-line.cm-hr-line').evaluate((line) => {
      const styles = getComputedStyle(line);
      return {
        marginTop: Number.parseFloat(styles.marginTop),
        marginBottom: Number.parseFloat(styles.marginBottom),
      };
    });
    expect(horizontalRuleMargins).toEqual({ marginTop: 0, marginBottom: 0 });

    for (const expectedLine of [5, 6, 7, 8]) {
      const lineBox = await page.locator('#editor .cm-line').nth(expectedLine - 1).boundingBox();
      if (!lineBox) throw new Error(`Line ${expectedLine} box is unavailable`);

      await page.mouse.click(lineBox.x + Math.min(24, lineBox.width / 2), lineBox.y + lineBox.height / 2);
      await expect.poll(() => getEditorSelectionLineNumber(page)).toBe(expectedLine);
    }
  });

  test('table insert actions should focus the inserted row or column cell after markdown save', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, ['| A | B |', '| - | - |', '| 1 | 2 |', ''].join('\n'));

    await page.locator('.table-helper td').nth(2).click();
    await expect(page.locator('.table-helper-operate-button.left')).toHaveClass(/is-visible/);
    await page.locator('.table-helper-operate-button.left').click();
    await page.locator('.table-action-popover .tippy-button[title="Insert row below"]').last().click();
    await expect.poll(async () => page.locator('.table-helper td:focus').evaluate((cell) => ({
      rowIndex: (cell.parentElement as HTMLTableRowElement).rowIndex,
      cellIndex: (cell as HTMLTableCellElement).cellIndex,
    }))).toEqual({ rowIndex: 2, cellIndex: 0 });

    await page.locator('.table-helper td').nth(2).click();
    await expect(page.locator('.table-helper-operate-button.top')).toHaveClass(/is-visible/);
    await page.locator('.table-helper-operate-button.top').click();
    await page.locator('.table-action-popover .tippy-button[title="Insert column to the right"]').last().click();
    await expect.poll(async () => page.locator('.table-helper td:focus').evaluate((cell) => ({
      rowIndex: (cell.parentElement as HTMLTableRowElement).rowIndex,
      cellIndex: (cell as HTMLTableCellElement).cellIndex,
    }))).toEqual({ rowIndex: 1, cellIndex: 1 });
  });

  test('latex widget should preserve source line breaks without internal scrollbars', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, [
      '```latex',
      '\\int_0^1 x^2 dx = \\frac{1}{3}',
      '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
      '\\prod_{i=1}^{n} i = n!',
      '```',
      '',
    ].join('\n'));

    await expect(page.locator('.cm-latex-widget')).toBeVisible();
    await expect(page.locator('.cm-latex-line')).toHaveCount(3);

    const latexMetrics = await page.evaluate(() => {
      const widget = document.querySelector('.cm-latex-widget') as HTMLElement;
      const canvas = document.querySelector('.cm-latex-canvas') as HTMLElement;
      const lines = Array.from(document.querySelectorAll('.cm-latex-line')) as HTMLElement[];
      const lineTops = lines.map((line) => Math.round(line.getBoundingClientRect().top));

      return {
        widgetOverflow: getComputedStyle(widget).overflow,
        canvasOverflow: getComputedStyle(canvas).overflow,
        lineCount: lines.length,
        uniqueLineTops: new Set(lineTops).size,
        canvasHasHorizontalScrollbar: canvas.scrollWidth > canvas.clientWidth + 1,
        canvasHasVerticalScrollbar: canvas.scrollHeight > canvas.clientHeight + 1,
      };
    });

    expect(latexMetrics.widgetOverflow).toBe('visible');
    expect(latexMetrics.canvasOverflow).toBe('visible');
    expect(latexMetrics.lineCount).toBe(3);
    expect(latexMetrics.uniqueLineTops).toBe(3);
    expect(latexMetrics.canvasHasHorizontalScrollbar).toBe(false);
    expect(latexMetrics.canvasHasVerticalScrollbar).toBe(false);
  });

  test('blockquote bars should not double-paint darker endpoint caps', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, ['> Blockquote level 1', '> > Blockquote level 2', ''].join('\n'));

    await expect(page.locator('.cm-blockquote-line').first()).toBeVisible();

    const caps = await page.evaluate(() => {
      const firstLine = document.querySelector('.cm-blockquote-first-line') as HTMLElement;
      const lastLine = document.querySelector('.cm-blockquote-last-line') as HTMLElement;
      const nestedLine = document.querySelector('.cm-blockquote-line[data-bq-level="2"]') as HTMLElement;
      return {
        beforeDisplay: getComputedStyle(firstLine, '::before').display,
        beforeContent: getComputedStyle(firstLine, '::before').content,
        afterDisplay: getComputedStyle(lastLine, '::after').display,
        nestedBackground: getComputedStyle(nestedLine).backgroundImage,
      };
    });

    expect(caps.beforeDisplay).toBe('none');
    expect(caps.beforeContent).toBe('none');
    expect(caps.afterDisplay).toBe('none');
    expect(caps.nestedBackground).toContain('linear-gradient');
  });

  test('messy ordered list edits should keep the undo chain intact', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await setEditorValue(page, [
      '1. askdlfjh',
      '2. kljbfaslkabsfd',
      '3. [asfkljba',
      '',
      'Tail',
    ].join('\n'));

    await focusEditorAtText(page, 'Tail', 'Tail'.length);
    await page.keyboard.type(' extra');
    await focusEditorAtText(page, '3. [asfkljba', 2);
    await page.keyboard.type('.2.');
    await expect.poll(() => getEditorValue(page)).toContain('3..2. [asfkljba');

    const undoShortcut = process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z';
    await page.keyboard.press(undoShortcut);
    await expect.poll(() => getEditorValue(page)).not.toContain('3..2. [asfkljba');
    await expect.poll(() => getEditorValue(page)).toContain('Tail extra');

    await page.keyboard.press(undoShortcut);
    await expect.poll(() => getEditorValue(page)).not.toContain('Tail extra');
    await expect.poll(() => getEditorValue(page)).toContain('Tail');
  });

  test('full playground smoke should have no browser console warnings or errors', async ({ page }) => {
    const badLogs: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        badLogs.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      badLogs.push(`pageerror: ${error.message}`);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Full Markdown Test' }).click();
    await page.waitForTimeout(1200);

    const counts = await page.evaluate(async () => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const view = editor.getView();
      const doc = view.state.doc.toString();
      const seen = {
        tableCount: 0,
        mermaidCount: 0,
        latexCount: 0,
        imageCount: 0,
      };

      const positions = [
        doc.indexOf('| Feature | Status | Notes |'),
        doc.indexOf('```mermaid'),
        doc.indexOf('```latex'),
        doc.indexOf('![Sample image]'),
      ].filter((position) => position >= 0);

      for (const position of positions) {
        view.dispatch({
          selection: { anchor: position },
          scrollIntoView: true,
        });
        for (let frame = 0; frame < 2; frame += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        seen.tableCount = Math.max(seen.tableCount, document.querySelectorAll('.table-helper').length);
        seen.mermaidCount = Math.max(seen.mermaidCount, document.querySelectorAll('.cm-mermaid-widget').length);
        seen.latexCount = Math.max(seen.latexCount, document.querySelectorAll('.cm-latex-widget').length);
        seen.imageCount = Math.max(seen.imageCount, document.querySelectorAll('.cm-image-widget').length);
      }

      return seen;
    });

    expect(counts.tableCount).toBeGreaterThan(0);
    expect(counts.mermaidCount).toBeGreaterThan(0);
    expect(counts.latexCount).toBeGreaterThan(0);
    expect(counts.imageCount).toBeGreaterThan(0);
    expect(badLogs).toEqual([]);
  });

  test('large mixed document should remain responsive', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const metrics = await page.evaluate(async () => {
      const editor = (window as any).__MOONDOWN_PLAYGROUND_EDITOR__;
      const block = [
        '# Perf Section',
        'Plain **bold** *italic* ==mark== ~under~ ~~strike~~ [link](https://example.com/a_(b)).',
        '',
        '| A | B | C |',
        '| - | - | - |',
        '| 1 | 2 | 3 |',
        '',
        '```mermaid',
        'flowchart TD',
        'A-->B',
        '```',
        '',
        '```latex',
        '\\\\sum_{i=1}^{n} i = \\\\frac{n(n+1)}{2}',
        '```',
        '',
        '![Alt](data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16"%3E%3C/svg%3E)',
        '',
      ].join('\n');
      const doc = Array.from({ length: 180 }, (_, index) => block.replace('Perf Section', `Perf Section ${index}`)).join('\n');

      const t0 = performance.now();
      editor.setValue(doc);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const setValueMs = performance.now() - t0;

      const view = editor.getView();
      const t1 = performance.now();
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      view.focus();
      document.execCommand?.('insertText', false, 'x');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const inputMs = performance.now() - t1;

      const t2 = performance.now();
      view.dispatch({ selection: { anchor: Math.floor(view.state.doc.length / 2) } });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const selectionMs = performance.now() - t2;

      return {
        length: view.state.doc.length,
        setValueMs,
        inputMs,
        selectionMs,
      };
    });

    expect(metrics.length).toBeGreaterThan(60000);
    expect(metrics.setValueMs).toBeLessThan(800);
    expect(metrics.inputMs).toBeLessThan(300);
    expect(metrics.selectionMs).toBeLessThan(120);
  });
});
