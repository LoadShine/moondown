import {Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {updateListEffect} from "./update-list-effect.ts";
import {updateLists} from "./list-functions.ts";
import {RangeSetBuilder} from "@codemirror/state";
import {syntaxTree} from "@codemirror/language";
import {BulletWidget} from "./bullet-widget.ts";

export const updateListPlugin = EditorView.updateListener.of((update) => {
    for (let tr of update.transactions) {
        for (let e of tr.effects) {
            if (e.is(updateListEffect)) {
                updateLists(update.view);
                break;
            }
        }
    }
});

export const bulletListPlugin = ViewPlugin.fromClass(class {
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
