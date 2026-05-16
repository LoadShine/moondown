import type { Extension } from '@codemirror/state';
import type {
    MoondownPlugin,
    MoondownPluginOrder,
    MoondownSlashCommand,
} from '../core';

/**
 * Type-safe plugin helper.
 * Use this to get autocomplete and compile-time validation for plugin hooks.
 */
export function defineMoondownPlugin<TPlugin extends MoondownPlugin>(plugin: TPlugin): TPlugin {
    return plugin;
}

interface CreateExtensionPluginOptions {
    order?: MoondownPluginOrder;
    slashCommands?: ReadonlyArray<MoondownSlashCommand>;
}

/**
 * Shortcut for extension-only plugins.
 *
 * Useful when you only need to register CodeMirror extensions
 * without runtime hooks (`onViewCreated` / `onUpdate` / `onDestroy`).
 */
export function createExtensionPlugin(
    name: string,
    extension: Extension | Extension[],
    options?: CreateExtensionPluginOptions
): MoondownPlugin {
    return defineMoondownPlugin({
        name,
        order: options?.order,
        slashCommands: options?.slashCommands,
        setup: () => extension,
    });
}
