import {EditorView, KeyBinding} from "@codemirror/view";
import {indentLess, indentMore} from "@codemirror/commands";
import {updateListEffect} from "./update-list-effect.ts";

export const listKeymap: KeyBinding[] = [
    {
        key: 'Tab',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const ranges = selection.ranges;

            for (let range of ranges) {
                const pos = range.head;
                const line = state.doc.lineAt(pos);
                const lineStart = line.from;
                const beforeCursor = state.doc.sliceString(lineStart, pos);

                // Match ordered or unordered list item
                const listItemMatch = beforeCursor.match(/^(\s*)(\d+\.|[-*])\s/);
                if (listItemMatch) {
                    indentMore(view);
                    view.dispatch({
                        effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                    });
                    return true;
                }
            }
            return false;
        },
    },
    {
        key: 'Shift-Tab',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const ranges = selection.ranges;

            for (let range of ranges) {
                const pos = range.head;
                const line = state.doc.lineAt(pos);
                const lineStart = line.from;
                const beforeCursor = state.doc.sliceString(lineStart, pos);

                // Match ordered or unordered list item
                const listItemMatch = beforeCursor.match(/^(\s*)(\d+\.|[-*])\s/);
                if (listItemMatch) {
                    indentLess(view);
                    view.dispatch({
                        effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                    });
                    return true;
                }
            }
            return false;
        },
    },
    {
        key: 'Enter',
        run: (view: EditorView) => {
            const { state } = view;
            const { selection } = state;
            const range = selection.main;
            const pos = range.head;
            const line = state.doc.lineAt(pos);
            const lineStart = line.from;
            const lineEnd = line.to;
            const beforeCursor = state.doc.sliceString(lineStart, pos);
            const afterCursor = state.doc.sliceString(pos, lineEnd);

            const orderedListMatch = beforeCursor.match(/^(\s*)(\d+)\.\s(.*)/);
            const unorderedListMatch = beforeCursor.match(/^(\s*)([-*])\s(.*)/);

            if (orderedListMatch || unorderedListMatch) {
                const match = orderedListMatch || unorderedListMatch;
                const indentation = match![1];
                const listMarker = match![2];
                const content = match![3];

                if (content.trim().length === 0 && afterCursor.trim().length === 0) {
                    // Current item is empty, return to previous level or exit list
                    const lines = state.doc.sliceString(0, lineStart).split('\n');
                    let prevIndentation: string | null = null;
                    let prevListMarker: string | null = null;

                    // Find previous level list item
                    for (let i = lines.length - 1; i >= 0; i--) {
                        const prevLine = lines[i];
                        const prevMatch = prevLine.match(/^(\s*)(\d+\.|[-*])\s/);
                        if (prevMatch) {
                            if (prevMatch[1].length < indentation.length) {
                                prevIndentation = prevMatch[1];
                                prevListMarker = prevMatch[2];
                                break;
                            }
                        }
                    }

                    if (prevIndentation !== null && prevListMarker !== null) {
                        // Previous level exists, adjust indentation and update marker
                        let newMarker = prevListMarker;
                        if (prevListMarker.match(/\d+\./)) {
                            newMarker = (parseInt(prevListMarker) + 1) + '.';
                        }
                        const transaction = state.update({
                            changes: {
                                from: lineStart,
                                to: lineEnd,
                                insert: prevIndentation + newMarker + ' ',
                            },
                            selection: { anchor: lineStart + prevIndentation.length + newMarker.length + 1 },
                        });
                        view.dispatch(transaction);
                    } else {
                        // No previous level, exit list
                        const transaction = state.update({
                            changes: {
                                from: lineStart,
                                to: lineStart + indentation.length + listMarker.length + 2,
                                insert: '',
                            },
                        });
                        view.dispatch(transaction);
                    }
                } else {
                    // Insert new list item
                    let newListItem: string;
                    if (orderedListMatch) {
                        const nextNumber = parseInt(listMarker) + 1;
                        newListItem = `\n${indentation}${nextNumber}. `;
                    } else {
                        newListItem = `\n${indentation}${listMarker} `;
                    }
                    const transaction = state.update({
                        changes: {
                            from: pos,
                            to: pos,
                            insert: newListItem,
                        },
                        selection: { anchor: pos + newListItem.length },
                    });
                    view.dispatch(transaction);
                }
                view.dispatch({
                    effects: updateListEffect.of({ from: 0, to: state.doc.length }),
                });
                return true;
            } else {
                return false;
            }
        },
    },
];