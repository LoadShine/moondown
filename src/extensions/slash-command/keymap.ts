import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { slashCommandState, toggleSlashCommand, updateSelectedIndex } from './fields';
import { slashCommandPlugin } from './slash-command';
import {
    findSelectableSlashCommandIndex,
    isSelectableSlashCommand,
    normalizeSelectedSlashCommandIndex,
    resolveFilteredSlashCommands,
} from './commands';
import { pluginSlashCommandsState, translationsState } from '../runtime/editor-runtime-state';

/**
 * Handles keydown events when the slash command menu is active.
 * @param view The CodeMirror EditorView instance.
 * @param event The keyboard event.
 * @returns `true` if the event was handled, `false` otherwise.
 */
export function handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
    const state = view.state.field(slashCommandState);
    const translations = view.state.field(translationsState);
    const pluginCommands = view.state.field(pluginSlashCommandsState);
    const plugin = view.plugin(slashCommandPlugin);

    if (view.state.facet(EditorState.readOnly)) {
        if (state.active) {
            view.dispatch({
                effects: toggleSlashCommand.of(false),
            });
        }
        return event.key === 'Escape';
    }

    // Globally handle Escape to close menu or abort AI
    if (event.key === 'Escape') {
        if (state.active) {
            view.dispatch({
                effects: toggleSlashCommand.of(false),
            });
        }
        if (plugin) {
            plugin.abortAIContinuation();
        }
        return true;
    }

    if (!state.active) return false;

    const filteredCommands = resolveFilteredSlashCommands(pluginCommands, state.filterText, translations);
    const selectedIndex = normalizeSelectedSlashCommandIndex(filteredCommands, state.selectedIndex);

    if (selectedIndex !== state.selectedIndex) {
        view.dispatch({
            effects: updateSelectedIndex.of(selectedIndex),
        });
    }

    if (filteredCommands.length === 0) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
            return true;
        }
        return false;
    }

    switch (event.key) {
        case 'ArrowDown': {
            const startIndex = (selectedIndex + 1) % filteredCommands.length;
            const nextIndex = findSelectableSlashCommandIndex(filteredCommands, startIndex, 1);
            if (nextIndex >= 0) {
                view.dispatch({
                    effects: updateSelectedIndex.of(nextIndex),
                });
            }
            return true;
        }
        case 'ArrowUp': {
            const startIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
            const prevIndex = findSelectableSlashCommandIndex(filteredCommands, startIndex, -1);
            if (prevIndex >= 0) {
                view.dispatch({
                    effects: updateSelectedIndex.of(prevIndex),
                });
            }
            return true;
        }
        case 'Enter':
            if (filteredCommands.length > 0) {
                const selectedCommand = filteredCommands[selectedIndex];
                if (!isSelectableSlashCommand(selectedCommand)) {
                    return true;
                }
                if (plugin) {
                    plugin.executeCommand(view, selectedCommand);
                } else {
                    view.dispatch({
                        changes: { from: state.pos, to: view.state.selection.main.from, insert: '' },
                        effects: toggleSlashCommand.of(false),
                    });
                    selectedCommand.execute(view);
                    view.focus();
                }
            }
            return true;
    }

    return false;
}

/**
 * The keymap for navigating and selecting items in the slash command menu.
 * It takes precedence for arrow keys, Enter, and Escape when the menu is active.
 */
export const slashCommandKeymap = keymap.of([
    {
        key: 'ArrowDown',
        run: (view) => handleKeyDown(view, { key: 'ArrowDown' } as KeyboardEvent),
        preventDefault: true,
    },
    {
        key: 'ArrowUp',
        run: (view) => handleKeyDown(view, { key: 'ArrowUp' } as KeyboardEvent),
        preventDefault: true,
    },
    {
        key: 'Enter',
        run: (view) => handleKeyDown(view, { key: 'Enter' } as KeyboardEvent),
        preventDefault: true,
    },
    {
        key: 'Escape',
        run: (view) => handleKeyDown(view, { key: 'Escape' } as KeyboardEvent),
        preventDefault: true,
    },
]);
