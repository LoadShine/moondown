import {StateField, EditorState} from '@codemirror/state';
import {EditorView, Decoration, DecorationSet, WidgetType} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {RangeSetBuilder} from './range-set-builder';
import {BlockWidget} from "@/extensions/markdown-syntax-hiding/block-widget.ts";

const hiddenMarkdown = Decoration.mark({class: 'cm-hidden-markdown'});
const visibleMarkdown = Decoration.mark({class: 'cm-visible-markdown'});

export const markdownSyntaxHidingField = StateField.define<DecorationSet>({
    create(_: EditorState) {
        return Decoration.none;
    },
    update(oldDecorations, transaction) {
        const builder = new RangeSetBuilder<Decoration>();
        const {state} = transaction;
        const selection = state.selection.main;

        syntaxTree(state).iterate({
            enter: (node) => {
                if (
                    ['Emphasis', 'StrongEmphasis', 'InlineCode', 'FencedCode', 'ATXHeading1', 'ATXHeading2',
                        'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'Blockquote', 'Link', 'Image', 'Strikethrough',
                        'Mark'].includes(node.type.name)
                ) {
                    const start = node.from;
                    const end = node.to;
                    const isSelected = selection.from <= end && selection.to >= start;

                    const decorationType = isSelected ? visibleMarkdown : hiddenMarkdown;

                    if (node.type.name === 'FencedCode') {
                        const fencedCodeStart = state.doc.lineAt(start);
                        const fencedCodeEnd = state.doc.lineAt(end);
                        const languageMatch = fencedCodeStart.text.match(/^```(\w+)/);
                        const language = languageMatch ? languageMatch[1] : '';
                        const codeContent = state.doc.sliceString(fencedCodeStart.from + fencedCodeStart.text.indexOf('```') + 3 + language.length + 1, fencedCodeEnd.to - 3);

                        if (!isSelected) {
                            const replacement = Decoration.replace({
                                widget: new BlockWidget(codeContent, 'blockcode', language),
                            });
                            builder.add(fencedCodeStart.from, fencedCodeEnd.to, replacement);
                        } else {
                            builder.add(fencedCodeStart.from, fencedCodeStart.from + fencedCodeStart.text.indexOf('```') + 3 + language.length + 1, decorationType);
                            builder.add(fencedCodeEnd.to - 3, fencedCodeEnd.to, decorationType);
                        }
                    } else if (node.type.name.startsWith('ATXHeading')) {
                        const headerLevel = parseInt(node.type.name.slice(-1));
                        builder.add(start, start + headerLevel + 1, decorationType);
                    } else if (node.type.name === 'Blockquote') {
                        const blockquoteStart = state.doc.lineAt(start);
                        const blockquoteEnd = state.doc.lineAt(end);
                        const blockquoteContent = state.doc.sliceString(blockquoteStart.from, blockquoteEnd.to);

                        if (!isSelected) {
                            const replacement = Decoration.replace({
                                widget: new BlockWidget(blockquoteContent, 'blockquote'),
                            });
                            builder.add(blockquoteStart.from, blockquoteEnd.to, replacement);
                        } else {
                            for (let pos = start; pos <= end;) {
                                const line = state.doc.lineAt(pos);
                                const lineStart = line.from;
                                const lineEnd = line.to;
                                const lineText = line.text;
                                const quoteIndex = lineText.indexOf('>');
                                if (quoteIndex !== -1) {
                                    builder.add(lineStart + quoteIndex, lineStart + quoteIndex + 1, visibleMarkdown);
                                }
                                pos = lineEnd + 1;
                            }
                        }
                    } else if (node.type.name === 'StrongEmphasis') {
                        builder.add(start, start + 2, decorationType);
                        builder.add(end - 2, end, decorationType);
                    } else if (node.type.name === 'InlineCode') {
                        if (!isSelected) {
                            const inlineCodeContent = state.doc.sliceString(start, end);
                            const replacement = Decoration.replace({
                                widget: new class extends WidgetType {
                                    toDOM() {
                                        const span = document.createElement("span");
                                        span.className = "cm-inline-code-widget";
                                        span.textContent = inlineCodeContent.slice(1, -1); // Remove backticks
                                        return span;
                                    }
                                    eq(other: this) { return other.toDOM().textContent === this.toDOM().textContent; }
                                    ignoreEvent() { return false; }
                                }
                            });
                            builder.add(start, end, replacement);
                        } else {
                            builder.add(start, start + 1, decorationType);
                            builder.add(end - 1, end, decorationType);
                        }
                    } else if (node.type.name === 'Link') {
                        const linkText = state.doc.sliceString(start, end);
                        const linkMatch = linkText.match(/\[([^\]]*)\]\(([^)]+)\)/);
                        if (linkMatch) {
                            const displayText = linkMatch[1] || linkMatch[2];
                            if (!isSelected) {
                                const replacement = Decoration.replace({
                                    widget: new class extends WidgetType {
                                        toDOM() {
                                            const span = document.createElement("span");
                                            span.className = "cm-link-widget";
                                            span.textContent = displayText;
                                            return span;
                                        }
                                        eq(other: this) { return other.toDOM().textContent === this.toDOM().textContent; }
                                        ignoreEvent() { return false; }
                                    }
                                });
                                builder.add(start, end, replacement);
                            } else {
                                const linkStart = start + linkText.indexOf('[');
                                const linkEnd = start + linkText.indexOf(']') + 1;
                                builder.add(linkStart, linkEnd, decorationType);
                                const urlStart = start + linkText.indexOf('(');
                                const urlEnd = start + linkText.indexOf(')') + 1;
                                builder.add(urlStart, urlEnd, decorationType);
                            }
                        }
                    } else if (node.type.name === 'Image') {
                        const imageText = state.doc.sliceString(start, end);
                        const imageMatch = imageText.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                        if (imageMatch) {
                            const alt = imageMatch[1];
                            const src = imageMatch[2];
                            if (!isSelected) {
                                let existingDeco: Decoration | undefined;
                                oldDecorations.between(start, end, (_, __, value) => {
                                    if (value.spec?.widget instanceof BlockWidget && value.spec.widget.src === src) {
                                        existingDeco = value;
                                        return false;
                                    }
                                });

                                if (existingDeco) {
                                    builder.add(start, end, existingDeco);
                                } else {
                                    const replacement = Decoration.replace({
                                        widget: new BlockWidget(imageText, 'image', undefined, alt, src),
                                    });
                                    builder.add(start, end, replacement);
                                }
                            } else {
                                builder.add(start, start + 2, decorationType); // Hide '!['
                                builder.add(start + 2 + alt.length, end, decorationType); // Hide '](...)'
                            }
                        }
                    } else if (node.type.name === 'Strikethrough') {
                        if (!isSelected) {
                            const strikethroughContent = state.doc.sliceString(start + 2, end - 2);
                            const replacement = Decoration.replace({
                                widget: new class extends WidgetType {
                                    toDOM() {
                                        const span = document.createElement("span");
                                        span.className = "cm-strikethrough-widget";
                                        span.textContent = strikethroughContent;
                                        return span;
                                    }
                                    eq(other: this) { return other.toDOM().textContent === this.toDOM().textContent; }
                                    ignoreEvent() { return false; }
                                }
                            });
                            builder.add(start, end, replacement);
                        } else {
                            builder.add(start, start + 2, decorationType);
                            builder.add(end - 2, end, decorationType);
                        }
                    } else if (node.type.name === 'Mark') {
                        if (!isSelected) {
                            const highlightContent = state.doc.sliceString(start + 2, end - 2);
                            const replacement = Decoration.replace({
                                widget: new class extends WidgetType {
                                    toDOM() {
                                        const span = document.createElement("span");
                                        span.className = "cm-highlight-widget";
                                        span.textContent = highlightContent;
                                        return span;
                                    }
                                    eq(other: this) { return other.toDOM().textContent === this.toDOM().textContent; }
                                    ignoreEvent() { return false; }
                                }
                            });
                            builder.add(start, end, replacement);
                        } else {
                            builder.add(start, start + 2, decorationType);
                            builder.add(end - 2, end, decorationType);
                        }
                    } else {
                        builder.add(start, start + 1, decorationType);
                        builder.add(end - 1, end, decorationType);
                    }
                }
            },
        });

        return builder.finish();
    },
    provide: (f) => EditorView.decorations.from(f),
});