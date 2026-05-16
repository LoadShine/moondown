import { EditorState, Transaction, type Extension } from '@codemirror/state';
import { EditorView, placeholder as viewPlaceholder } from '@codemirror/view';
import { forceParsing } from '@codemirror/language';
import type {
    AIStreamHandler,
    MoondownTranslations,
    ResolvedEditorConfig,
    Theme,
} from '../../core';
import { createDefaultExtensions } from '../../extensions/default-extensions';
import {
    placeholderCompartment,
    readOnlyCompartment,
    setLocale,
    setOnAIStream,
    setPluginSlashCommands,
    setTranslations,
    themeCompartment,
    wysiwygCompartment,
} from '../../extensions/runtime/editor-runtime-state';
import { resolveWysiwygExtensions } from '../../extensions/runtime/wysiwyg-extensions';
import { resolveThemeExtension } from '../theme/resolve-theme';
import { createEditorLifecycleListener } from './editor-lifecycle-listener';
import { EditorPluginRuntime } from './editor-plugin-runtime';

interface EditorRuntimeOptions {
    element: HTMLElement;
    initialDoc: string;
    config: ResolvedEditorConfig;
}

function resolvePlaceholderExtension(placeholder: string): Extension {
    if (placeholder.length === 0) {
        return [];
    }
    return viewPlaceholder(placeholder);
}

export class EditorRuntime {
    private readonly view: EditorView;
    private readonly pluginRuntime: EditorPluginRuntime;
    private readonly config: ResolvedEditorConfig;

    constructor({ element, initialDoc, config }: EditorRuntimeOptions) {
        this.config = {
            ...config,
            translations: { ...config.translations },
            plugins: [...config.plugins],
        };

        this.pluginRuntime = new EditorPluginRuntime({
            plugins: this.config.plugins,
            config: this.config,
            initialDoc,
        });

        const extensions: Extension[] = [
            ...this.pluginRuntime.preRuntimeExtensions,
            ...createDefaultExtensions(),
            ...this.pluginRuntime.postRuntimeExtensions,
            readOnlyCompartment.of(EditorState.readOnly.of(config.readOnly)),
            placeholderCompartment.of(resolvePlaceholderExtension(config.placeholder)),
            createEditorLifecycleListener({
                onChange: config.onChange,
                onFocus: config.onFocus,
                onBlur: config.onBlur,
            }),
        ];

        const state = EditorState.create({
            doc: initialDoc,
            extensions,
        });

        this.view = new EditorView({
            state,
            parent: element,
        });
        this.pluginRuntime.bindView(this.view, this.config);
        this.view.dispatch({
            effects: setPluginSlashCommands.of(this.pluginRuntime.runtimeSlashCommands),
        });

        this.setTheme(this.config.theme);
        this.toggleSyntaxHiding(this.config.syntaxHiding);
        this.setTranslations(this.config.translations);
        this.setLocale(this.config.locale);

        if (this.config.onAIStream) {
            this.setAIStreamHandler(this.config.onAIStream);
        }
    }

    get editorView(): EditorView {
        return this.view;
    }

    getValue(): string {
        return this.view.state.doc.toString();
    }

    setValue(value: string): void {
        this.view.dispatch({
            changes: {
                from: 0,
                to: this.view.state.doc.length,
                insert: value,
            },
            annotations: Transaction.addToHistory.of(false),
        });
        this.refreshWysiwygWidgets();
    }

    toggleSyntaxHiding(enabled: boolean): void {
        this.config.syntaxHiding = enabled;
        this.view.dispatch({
            effects: wysiwygCompartment.reconfigure(resolveWysiwygExtensions(enabled)),
        });
    }

    setTheme(theme: Theme): void {
        this.config.theme = theme;
        this.view.dispatch({
            effects: themeCompartment.reconfigure(resolveThemeExtension(theme)),
        });
    }

    setReadOnly(enabled: boolean): void {
        this.config.readOnly = enabled;
        this.view.dispatch({
            effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(enabled)),
        });
    }

    setPlaceholder(placeholder: string): void {
        this.config.placeholder = placeholder;
        this.view.dispatch({
            effects: placeholderCompartment.reconfigure(resolvePlaceholderExtension(placeholder)),
        });
    }

    setAIStreamHandler(handler: AIStreamHandler): void {
        this.config.onAIStream = handler;
        this.view.dispatch({ effects: setOnAIStream.of(handler) });
    }

    setTranslations(translations: MoondownTranslations): void {
        const normalizedTranslations = { ...translations };
        this.config.translations = normalizedTranslations;
        this.view.dispatch({ effects: setTranslations.of(normalizedTranslations) });
    }

    setLocale(locale: string): void {
        const normalizedLocale = locale || 'en';
        this.config.locale = normalizedLocale;
        this.view.dispatch({ effects: setLocale.of(normalizedLocale) });
    }

    focus(): void {
        this.view.focus();
    }

    destroy(): void {
        this.pluginRuntime.destroy();
        this.view.destroy();
    }

    private refreshWysiwygWidgets(): void {
        if (!this.config.syntaxHiding) {
            return;
        }

        forceParsing(this.view, this.view.state.doc.length, 500);
        this.view.dispatch({
            effects: wysiwygCompartment.reconfigure(resolveWysiwygExtensions(true)),
            annotations: Transaction.addToHistory.of(false),
        });
    }
}
