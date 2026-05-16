import type { Extension } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import type {
    MoondownPlugin,
    MoondownSlashCommand,
    MoondownPluginViewContext,
    ResolvedEditorConfig,
} from '../../core';

interface EditorPluginRuntimeOptions {
    plugins: ReadonlyArray<MoondownPlugin>;
    config: ResolvedEditorConfig;
    initialDoc: string;
}

interface HookedPlugin {
    plugin: MoondownPlugin;
    viewContext: MoondownPluginViewContext | null;
}

function toExtensionArray(result: Extension | Extension[] | void): Extension[] {
    if (!result) {
        return [];
    }
    return Array.isArray(result) ? [...result] : [result];
}

function getPluginLabel(plugin: MoondownPlugin): string {
    const trimmedName = plugin.name?.trim();
    if (trimmedName && trimmedName.length > 0) {
        return trimmedName;
    }
    return 'anonymous-plugin';
}

function withPluginErrorBoundary(
    plugin: MoondownPlugin,
    hookName: string,
    fn: () => void
): void {
    try {
        fn();
    } catch (error) {
        console.error(`[MoondownPlugin:${getPluginLabel(plugin)}] ${hookName} failed`, error);
    }
}

export class EditorPluginRuntime {
    private readonly preExtensions: Extension[] = [];
    private readonly postExtensions: Extension[] = [];
    private readonly slashCommands: MoondownSlashCommand[] = [];
    private readonly hookedPlugins: HookedPlugin[] = [];

    constructor({ plugins, config, initialDoc }: EditorPluginRuntimeOptions) {
        for (const plugin of plugins) {
            const hookedPlugin: HookedPlugin = {
                plugin,
                viewContext: null,
            };
            this.hookedPlugins.push(hookedPlugin);
            this.slashCommands.push(...this.collectSlashCommands(plugin));

            const setup = plugin.setup;
            if (!setup) {
                continue;
            }

            withPluginErrorBoundary(plugin, 'setup', () => {
                const result = setup({
                    initialDoc,
                    config,
                });
                const resolvedExtensions = toExtensionArray(result);
                if (plugin.order === 'pre') {
                    this.preExtensions.push(...resolvedExtensions);
                    return;
                }
                this.postExtensions.push(...resolvedExtensions);
            });
        }

        if (this.hookedPlugins.some(({ plugin }) => plugin.onUpdate)) {
            this.postExtensions.push(
                EditorView.updateListener.of((update: ViewUpdate) => {
                    this.handleUpdate(update);
                })
            );
        }
    }

    get preRuntimeExtensions(): Extension[] {
        return [...this.preExtensions];
    }

    get postRuntimeExtensions(): Extension[] {
        return [...this.postExtensions];
    }

    get runtimeSlashCommands(): ReadonlyArray<MoondownSlashCommand> {
        return [...this.slashCommands];
    }

    bindView(view: EditorView, config: ResolvedEditorConfig): void {
        for (const hookedPlugin of this.hookedPlugins) {
            hookedPlugin.viewContext = {
                view,
                config,
            };
        }

        for (const { plugin, viewContext } of this.hookedPlugins) {
            if (!plugin.onViewCreated || !viewContext) {
                continue;
            }
            withPluginErrorBoundary(plugin, 'onViewCreated', () => {
                plugin.onViewCreated?.(viewContext);
            });
        }
    }

    destroy(): void {
        for (const { plugin, viewContext } of this.hookedPlugins) {
            if (!plugin.onDestroy || !viewContext) {
                continue;
            }
            withPluginErrorBoundary(plugin, 'onDestroy', () => {
                plugin.onDestroy?.(viewContext);
            });
        }
    }

    private handleUpdate(update: ViewUpdate): void {
        for (const { plugin, viewContext } of this.hookedPlugins) {
            if (!plugin.onUpdate || !viewContext) {
                continue;
            }
            withPluginErrorBoundary(plugin, 'onUpdate', () => {
                plugin.onUpdate?.(update, viewContext);
            });
        }
    }

    private collectSlashCommands(plugin: MoondownPlugin): MoondownSlashCommand[] {
        if (!plugin.slashCommands || plugin.slashCommands.length === 0) {
            return [];
        }

        const pluginLabel = getPluginLabel(plugin);
        const normalized: MoondownSlashCommand[] = [];

        plugin.slashCommands.forEach((command, index) => {
            if (!command || typeof command.execute !== 'function') {
                return;
            }

            const id = command.id?.trim() || `${pluginLabel}-slash-${index + 1}`;
            const fallbackTitle = command.titleKey?.trim() || id;
            const title = command.title?.trim() || fallbackTitle;
            const icon = command.icon?.trim() || 'puzzle';
            const keywords = (command.keywords ?? [])
                .map((keyword) => keyword.trim())
                .filter((keyword) => keyword.length > 0);

            const wrappedExecute: MoondownSlashCommand['execute'] = (view) => {
                try {
                    const result = command.execute(view);
                    if (result instanceof Promise) {
                        return result.catch((error) => {
                            console.error(`[MoondownPlugin:${pluginLabel}] slash command "${id}" failed`, error);
                        });
                    }
                    return result;
                } catch (error) {
                    console.error(`[MoondownPlugin:${pluginLabel}] slash command "${id}" failed`, error);
                    return;
                }
            };

            normalized.push({
                ...command,
                id,
                title,
                icon,
                keywords,
                execute: wrappedExecute,
            });
        });

        return normalized;
    }
}
