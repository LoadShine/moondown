import {EditorState, type Extension} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import { handleKeyDown, slashCommandKeymap } from './keymap';
import { newTextState, scrollIntoView } from './ghost-writer';
import { slashCommandState, toggleSlashCommand } from './fields';
import { slashCommandPlugin } from './slash-command';

/**
 * Returns a CodeMirror extension for the slash command feature.
 * This bundles the state management, view plugin for the menu, keymaps,
 * and event handlers necessary for triggering and controlling the command menu.
 */
export function slashCommand(): Extension {
    return [
        slashCommandState,
        slashCommandPlugin,
        newTextState,
        slashCommandKeymap,
        EditorView.domEventHandlers({
            keydown(event, view) {
                if (event.key === "/" && !view.state.facet(EditorState.readOnly)) {
                    view.dispatch({
                        effects: toggleSlashCommand.of(true)
                    })
                }
                // Handle Escape key globally
                if (event.key === "Escape") {
                    return handleKeyDown(view, event)
                }
            }
        }),
        EditorView.updateListener.of(update => {
            if (update.transactions.length > 0) {
                for (const transaction of update.transactions) {
                    for (const effect of transaction.effects) {
                        if (effect.is(scrollIntoView)) {
                            update.view.dispatch({
                                effects: EditorView.scrollIntoView(effect.value)
                            })
                        }
                    }
                }
            }
        }),
    ]
}
