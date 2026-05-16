import { EditorView, type KeyBinding } from "@codemirror/view";
import { indentLess, indentMore, deleteCharBackward, deleteCharForward } from "@codemirror/commands";
import { updateListEffect } from "./update-list-effect";
import { getListInfo, generateListItem } from "./list-functions";
import { LIST_INDENT, LIST_UPDATE_DELAY } from "./constants";

/**
 * Keymap for list editing functionality.
 * Handles Tab, Shift-Tab, Enter, Backspace, and Delete keys to provide
 * intuitive list management.
 */
export const listKeymap: KeyBinding[] = [
    {
        key: 'Tab',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const pos = selection.main.head;
            const listInfo = getListInfo(state, pos);

            if (listInfo) {
                // Indent the list item
                indentMore(view);

                // Defer list number update to ensure the indent operation completes
                setTimeout(() => {
                    view.dispatch({
                        effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                    });
                }, LIST_UPDATE_DELAY);

                return true;
            }
            return false;
        },
    },
    {
        key: 'Shift-Tab',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const pos = selection.main.head;
            const listInfo = getListInfo(state, pos);

            if (listInfo && listInfo.indent > LIST_INDENT.MIN) {
                // Decrease indentation
                indentLess(view);

                // Defer list number update
                setTimeout(() => {
                    view.dispatch({
                        effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                    });
                }, LIST_UPDATE_DELAY);

                return true;
            }
            return false;
        },
    },
    {
        key: 'Enter',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const pos = selection.main.head;
            const listInfo = getListInfo(state, pos);

            if (listInfo) {
                const line = state.doc.lineAt(pos);

                if (listInfo.content.trim() === '') {
                    // If the current list item is empty, de-indent or exit the list
                    if (listInfo.indent === LIST_INDENT.MIN) {
                        // At the top level, so exit the list
                        const transaction = state.update({
                            changes: {
                                from: line.from,
                                to: line.to,
                                insert: '',
                            },
                            selection: { anchor: line.from }
                        });
                        view.dispatch(transaction);
                    } else {
                        // De-indent to the previous level
                        const newIndent = Math.max(LIST_INDENT.MIN, listInfo.indent - LIST_INDENT.SIZE);
                        const newListItem = generateListItem(listInfo.type, newIndent);

                        const transaction = state.update({
                            changes: {
                                from: line.from,
                                to: line.to,
                                insert: newListItem,
                            },
                            selection: { anchor: line.from + newListItem.length }
                        });
                        view.dispatch(transaction);

                        setTimeout(() => {
                            view.dispatch({
                                effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                            });
                        }, LIST_UPDATE_DELAY);
                    }
                } else {
                    // Create a new list item at the same level
                    const newListItem = generateListItem(listInfo.type, listInfo.indent);
                    const insertText = `\n${newListItem}`;

                    const transaction = state.update({
                        changes: {
                            from: pos,
                            to: pos,
                            insert: insertText,
                        },
                        selection: { anchor: pos + insertText.length }
                    });
                    view.dispatch(transaction);

                    setTimeout(() => {
                        view.dispatch({
                            effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                        });
                    }, LIST_UPDATE_DELAY);
                }

                return true;
            }

            return false;
        },
    },
    {
        key: 'Backspace',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const pos = selection.main.head;
            const currentLine = state.doc.lineAt(pos);
            const currentListInfo = getListInfo(state, pos);

            let previousLineListInfo = null;
            if (currentLine.number > 1) {
                const previousLine = state.doc.line(currentLine.number - 1);
                previousLineListInfo = getListInfo(state, previousLine.from);
            }

            // If the deletion might affect list numbering, run default action and then trigger an update.
            if (currentListInfo || previousLineListInfo) {
                const result = deleteCharBackward(view);

                setTimeout(() => {
                    view.dispatch({
                        effects: updateListEffect.of({ from: 0, to: view.state.doc.length }),
                    });
                }, LIST_UPDATE_DELAY);

                return result;
            }

            return false;
        },
    },
    {
        key: 'Delete',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const pos = selection.main.head;
            const currentLine = state.doc.lineAt(pos);
            const currentListInfo = getListInfo(state, pos);

            let nextLineListInfo = null;
            if (currentLine.number < state.doc.lines) {
                const nextLine = state.doc.line(currentLine.number + 1);
                nextLineListInfo = getListInfo(state, nextLine.from);
            }

            if (currentListInfo || nextLineListInfo) {
                const result = deleteCharForward(view);

                setTimeout(() => {
                    view.dispatch({
                        effects: updateListEffect.of({ from: 0, to: view.state.doc.length }),
                    });
                }, LIST_UPDATE_DELAY);

                return result;
            }

            return false;
        },
    },
];