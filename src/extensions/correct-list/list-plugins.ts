import { Decoration, type DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { updateListEffect } from "./update-list-effect";
import { updateLists } from "./list-functions";
import { type Text, RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { BulletWidget } from "./bullet-widget";
import { LIST_INDENT, LIST_PATTERNS } from "./constants";

/**
 * Maximum number of unique bullet styles to cycle through before repeating.
 */
const BULLET_STYLE_COUNT = 6;

function textHasListMarker(text: string): boolean {
    return LIST_PATTERNS.ANY.test(text) ||
        new RegExp('\n' + LIST_PATTERNS.ANY.source.slice(1)).test(text);
}

function touchesListMarker(doc: Text, from: number, to: number): boolean {
    if (doc.length === 0) return false;

    const safeFrom = Math.max(0, Math.min(from, doc.length));
    const safeTo = Math.max(safeFrom, Math.min(to, doc.length));
    const line = doc.lineAt(safeFrom);
    const markerMatch = line.text.match(/^(\s*)(?:\d[\d.]*\.?|[-*+])\s+/);

    if (!markerMatch) return false;

    const markerEnd = line.from + markerMatch[0].length;
    return safeFrom <= markerEnd && safeTo <= markerEnd;
}

/**
 * A ViewPlugin that listens for document changes or specific effects to trigger
 * automatic list number and structure updates.
 */
export const updateListPlugin = EditorView.updateListener.of((update) => {
    // Check for a manual update trigger via `updateListEffect`.
    let hasManualUpdate = false;
    for (const tr of update.transactions) {
        for (const e of tr.effects) {
            if (e.is(updateListEffect)) {
                hasManualUpdate = true;
                updateLists(update.view);
                return;
            }
        }
    }

    // If no manual trigger, check if document changes warrant an update.
    if (!hasManualUpdate && update.docChanged) {
        let needsUpdate = false;

        for (const tr of update.transactions) {
            tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                const deletedText = update.startState.doc.sliceString(fromA, toA);
                const insertedText = inserted.toString();

                const containsLineBreak = deletedText.includes('\n') || insertedText.includes('\n');
                const editingMarkerOnly = !containsLineBreak && (
                    touchesListMarker(update.startState.doc, fromA, toA) ||
                    touchesListMarker(update.state.doc, fromB, toB)
                );

                if (editingMarkerOnly) {
                    return;
                }

                // Re-numbering is only needed for structural list changes. Plain
                // content edits inside a list must not inject transactions into
                // the user's undo chain.
                if (containsLineBreak || textHasListMarker(deletedText) || textHasListMarker(insertedText)) {
                    needsUpdate = true;
                }
            });

            if (needsUpdate) break;
        }

        if (needsUpdate) {
            updateLists(update.view);
        }
    }
});

/**
 * A ViewPlugin that replaces standard unordered list markers (e.g., `-`, `*`)
 * with custom, styled bullet points using a Decoration Widget.
 */
export const bulletListPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (node) => {
                    if (node.name === 'ListItem' || node.name.includes('ListItem')) {
                        const line = view.state.doc.lineAt(node.from);
                        const blockquoteMatch = line.text.match(/^((?:>\s*)*)/);
                        const blockquotePrefix = blockquoteMatch ? blockquoteMatch[1] : '';
                        const remainingText = line.text.slice(blockquotePrefix.length);
                        const unorderedMatch = remainingText.match(/^(\s*)([-*+])(\s+)/);

                        if (unorderedMatch) {
                            const indentation = unorderedMatch[1] || '';
                            const marker = unorderedMatch[2];
                            const spaceAfter = unorderedMatch[3];

                            const indentLevel = Math.floor(indentation.length / LIST_INDENT.SIZE);
                            const levelClass = `cm-bullet-list-l${indentLevel % BULLET_STYLE_COUNT}`;

                            const bulletStart = line.from + blockquotePrefix.length + indentation.length;
                            const bulletEnd = bulletStart + marker.length + spaceAfter.length;

                            builder.add(
                                bulletStart,
                                bulletEnd,
                                Decoration.replace({
                                    widget: new BulletWidget(levelClass, indentLevel, indentation),
                                })
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
