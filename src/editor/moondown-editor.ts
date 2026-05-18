import type { EditorView } from '@codemirror/view';
import { openSearchPanel } from '@codemirror/search';
import type { AIStreamHandler, EditorConfig, MoondownTranslations, Theme } from '../core';
import { normalizeEditorConfig, resolveInitialDocument } from './config/normalize-editor-config';
import { EditorRuntime } from './runtime/editor-runtime';

/**
 * Public editor facade.
 * Keeps API stable while hiding internal extension/runtime composition details.
 */
export class MoondownEditor {
    public readonly view: EditorView;
    private readonly runtime: EditorRuntime;

    constructor(element: HTMLElement, initialDoc = '', config?: EditorConfig) {
        const resolvedConfig = normalizeEditorConfig(config);
        const resolvedInitialDoc = resolveInitialDocument(initialDoc, config);

        this.runtime = new EditorRuntime({
            element,
            initialDoc: resolvedInitialDoc,
            config: resolvedConfig,
        });

        this.view = this.runtime.editorView;
    }

    getValue(): string {
        return this.runtime.getValue();
    }

    setValue(value: string): void {
        this.runtime.setValue(value);
    }

    toggleSyntaxHiding(enabled: boolean): void {
        this.runtime.toggleSyntaxHiding(enabled);
    }

    setTheme(theme: Theme): void {
        this.runtime.setTheme(theme);
    }

    setReadOnly(enabled: boolean): void {
        this.runtime.setReadOnly(enabled);
    }

    setPlaceholder(text: string): void {
        this.runtime.setPlaceholder(text);
    }

    setAIStreamHandler(handler: AIStreamHandler): void {
        this.runtime.setAIStreamHandler(handler);
    }

    setTranslations(translations: MoondownTranslations): void {
        this.runtime.setTranslations(translations);
    }

    setLocale(locale: string): void {
        this.runtime.setLocale(locale);
    }

    getView(): EditorView {
        return this.view;
    }

    focus(): void {
        this.runtime.focus();
    }

    openSearch(): void {
        openSearchPanel(this.view);
    }

    openReplace(): void {
        openSearchPanel(this.view);
        requestAnimationFrame(() => {
            const replaceField = this.view.dom.querySelector<HTMLInputElement>('.cm-search input[name="replace"]');
            replaceField?.focus();
            replaceField?.select();
        });
    }

    destroy(): void {
        this.runtime.destroy();
    }
}
