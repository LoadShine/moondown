import {Extension, RangeSetBuilder, StateEffect} from '@codemirror/state';
import {
    EditorView,
    keymap,
    KeyBinding,
    ViewPlugin,
    DecorationSet,
    Decoration,
    ViewUpdate,
    WidgetType
} from '@codemirror/view';
import { indentMore, indentLess } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';

// Effect used to notify that the list needs to be updated
const updateListEffect = StateEffect.define<{ from: number; to: number }>({});

// Define key bindings
const listKeymap: KeyBinding[] = [
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

// Plugin to update lists
const updateListPlugin = EditorView.updateListener.of((update) => {
    for (let tr of update.transactions) {
        for (let e of tr.effects) {
            if (e.is(updateListEffect)) {
                updateLists(update.view);
                break;
            }
        }
    }
});

// Function to update lists
function updateLists(view: EditorView) {
    const { state } = view;
    const doc = state.doc;
    const lines = doc.toString().split('\n');
    let changes = [];

    let orderedListLevels: { indent: string; number: number }[] = [];
    let prevIndentLevel = -1;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];
        const lineStart = doc.line(lineNumber + 1).from;
        const orderedMatch = line.match(/^(\s*)(\d+)\.\s/);
        const unorderedMatch = line.match(/^(\s*)([-*])\s/);

        if (orderedMatch) {
            const indentation = orderedMatch[1];
            const currentNumber = parseInt(orderedMatch[2]);
            const indentLevel = indentation.length;

            if (indentLevel > prevIndentLevel) {
                // Starting a new sub-level, reset numbering
                orderedListLevels = orderedListLevels.filter(l => l.indent.length < indentLevel);
                orderedListLevels.push({ indent: indentation, number: 1 });
            } else if (indentLevel < prevIndentLevel) {
                // Returning to a previous level, remove deeper levels
                orderedListLevels = orderedListLevels.filter(l => l.indent.length <= indentLevel);
            }

            const level = orderedListLevels[orderedListLevels.length - 1];
            if (currentNumber !== level.number) {
                const numberStart = lineStart + indentation.length;
                const numberEnd = numberStart + orderedMatch[2].length;
                changes.push({
                    from: numberStart,
                    to: numberEnd,
                    insert: level.number.toString(),
                });
            }

            level.number++;
            prevIndentLevel = indentLevel;
        } else if (unorderedMatch) {
            // For unordered lists, we don't need to change anything
            prevIndentLevel = unorderedMatch[1].length;
        } else if (line.trim().length === 0) {
            // Empty line, do nothing
        } else {
            // Non-list content, reset numbering for the next list
            orderedListLevels = [];
            prevIndentLevel = -1;
        }
    }

    if (changes.length > 0) {
        view.dispatch({ changes });
    }
}

class BulletWidget extends WidgetType {
    constructor(private className: string, private level: number, private indentation: string) {
        super();
    }

    toDOM() {
        let span = document.createElement("span");
        span.innerHTML = `${this.indentation}${this.getBulletSymbol(this.level)} `;
        span.className = `cm-bullet-list ${this.className}`;
        return span;
    }

    private getBulletSymbol(level: number): string {
        const symbols = ["●", "○", "■", "□", "◆", "◇"];
        return symbols[level % symbols.length];
    }
}

const bulletListPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (node) => {
                    if (node.name.includes('ListItem')) {
                        const line = view.state.doc.lineAt(node.from);
                        const match = line.text.match(/^(\s*)([-*])\s/);
                        if (match) {
                            const indentation = match[1] || '';
                            const indentLevel = Math.floor(indentation.length / 2);
                            const levelClass = `cm-bullet-list-l${indentLevel % 3}`;

                            const bulletStart = line.from + match.index!;
                            const bulletEnd = bulletStart + match[0].length;

                            // Add styled bullet point with correct level and indentation
                            builder.add(
                                bulletStart,
                                bulletStart,
                                Decoration.widget({
                                    widget: new BulletWidget(levelClass, indentLevel, indentation),
                                    side: 1
                                })
                            );

                            // Hide original indentation, dash or asterisk, and following space
                            builder.add(
                                bulletStart,
                                bulletEnd,
                                Decoration.replace({})
                            );
                        }
                    }
                }
            });
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations,
});

// Final extension
export const correctList: Extension = [
    keymap.of(listKeymap),
    updateListPlugin,
    bulletListPlugin,
];
