import type { EditorConfig, ResolvedEditorConfig } from '../../core';

const DEFAULT_LOCALE = 'en';

export function resolveInitialDocument(initialDoc: string | undefined, config?: EditorConfig): string {
    if (typeof initialDoc === 'string' && initialDoc.length > 0) {
        return initialDoc;
    }
    return config?.initialDoc ?? '';
}

export function normalizeEditorConfig(config?: EditorConfig): ResolvedEditorConfig {
    return {
        theme: config?.theme ?? 'light',
        syntaxHiding: config?.syntaxHiding ?? true,
        placeholder: config?.placeholder ?? '',
        readOnly: config?.readOnly ?? false,
        onChange: config?.onChange,
        onFocus: config?.onFocus,
        onBlur: config?.onBlur,
        translations: { ...(config?.translations ?? {}) },
        locale: normalizeLocale(config?.locale),
        onAIStream: config?.onAIStream ?? null,
        plugins: normalizePlugins(config?.plugins),
    };
}

function normalizeLocale(locale: string | undefined): string {
    const normalizedLocale = locale?.trim();
    return normalizedLocale && normalizedLocale.length > 0 ? normalizedLocale : DEFAULT_LOCALE;
}

function normalizePlugins(plugins: EditorConfig['plugins']): ResolvedEditorConfig['plugins'] {
    if (!plugins || plugins.length === 0) {
        return [];
    }
    return [...plugins];
}
