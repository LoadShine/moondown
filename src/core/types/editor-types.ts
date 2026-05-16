import type { Extension } from '@codemirror/state';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type { EditorState } from "@codemirror/state";

/**
 * Core type definitions for the editor
 */

/** Theme options */
export type Theme = 'light' | 'dark';

/** Translation strings for Moondown UI */
export type MoondownTranslations = Record<string, string>;

/** AI stream handler function type */
export type AIStreamHandler = (
    systemPrompt: string,
    userPrompt: string,
    signal: AbortSignal
) => Promise<ReadableStream<string>>;

/** Plugin execution order relative to built-in extensions. */
export type MoondownPluginOrder = 'pre' | 'post';

/**
 * Public slash command contract.
 *
 * Commands can be provided by core features and user plugins.
 */
export interface MoondownSlashCommand {
    /** Stable identifier for dedupe/debugging. */
    id: string;
    /** Display name used when `titleKey` has no translation. */
    title: string;
    /** Optional i18n key for translated title. */
    titleKey?: string;
    /** Lucide icon name. Defaults to `puzzle` for plugin commands. */
    icon?: string;
    /** Optional search aliases (lowercased in matcher). */
    keywords?: ReadonlyArray<string>;
    /** Command action executed after slash token removal. */
    execute: (view: EditorView) => void | Promise<void | AbortController>;
}

/**
 * Context passed to plugin `setup` at editor construction time.
 */
export interface MoondownPluginSetupContext {
    initialDoc: string;
    config: Readonly<ResolvedEditorConfig>;
}

/**
 * Context passed to plugin runtime hooks after the EditorView is available.
 */
export interface MoondownPluginViewContext {
    view: EditorView;
    config: Readonly<ResolvedEditorConfig>;
}

/**
 * Public plugin contract.
 *
 * `setup` can return one or more CodeMirror extensions.
 * Runtime hooks are optional and isolated; hook errors are caught and logged.
 */
export interface MoondownPlugin {
    /** Unique identifier used for diagnostics. */
    name: string;
    /** Execution stage: `pre` runs before built-ins, `post` after built-ins. */
    order?: MoondownPluginOrder;
    /** Build-time extension factory. */
    setup?: (context: MoondownPluginSetupContext) => Extension | Extension[] | void;
    /** Called after EditorView is created. */
    onViewCreated?: (context: MoondownPluginViewContext) => void;
    /** Called on every view update. */
    onUpdate?: (update: ViewUpdate, context: MoondownPluginViewContext) => void;
    /** Called right before editor destroy. */
    onDestroy?: (context: MoondownPluginViewContext) => void;
    /** Optional slash commands contributed by this plugin. */
    slashCommands?: ReadonlyArray<MoondownSlashCommand>;
}

/** Editor configuration options */
export interface EditorConfig {
    /** Initial document content */
    initialDoc?: string;
    /** Initial theme */
    theme?: Theme;
    /** Enable syntax hiding */
    syntaxHiding?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Make editor read-only */
    readOnly?: boolean;
    /** Content change callback */
    onChange?: (update: ViewUpdate) => void;
    /** Focus event callback */
    onFocus?: () => void;
    /** Blur event callback */
    onBlur?: () => void;
    /** Translation strings */
    translations?: MoondownTranslations;
    /** Locale used by built-in prompts/UI behavior (e.g. "en", "zh-CN") */
    locale?: string;
    /** AI stream handler */
    onAIStream?: AIStreamHandler;
    /** User-defined plugins. */
    plugins?: ReadonlyArray<MoondownPlugin>;
}

/**
 * Internal normalized editor configuration.
 * Keeps runtime code deterministic by replacing optional fields with defaults.
 */
export interface ResolvedEditorConfig {
    theme: Theme;
    syntaxHiding: boolean;
    placeholder: string;
    readOnly: boolean;
    onChange?: (update: ViewUpdate) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    translations: MoondownTranslations;
    locale: string;
    onAIStream: AIStreamHandler | null;
    plugins: ReadonlyArray<MoondownPlugin>;
}

/** Position range in the document */
export interface Range {
    from: number;
    to: number;
}

/** Text selection with content */
export interface Selection extends Range {
    text: string;
}

/** Coordinates in the viewport */
export interface Coordinates {
    x: number;
    y: number;
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
}

/** Line information */
export interface LineInfo {
    number: number;
    from: number;
    to: number;
    text: string;
    length: number;
}

/** Action handler function type */
export type ActionHandler = (view: EditorView) => boolean | Promise<boolean>;

/** State checker function type */
export type StateChecker = (state: EditorState) => boolean;

/** Event handler function type */
export type EventHandler<T extends Event = Event> = (event: T, view: EditorView) => boolean | void;
