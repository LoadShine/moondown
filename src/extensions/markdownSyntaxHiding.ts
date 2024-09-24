import {EditorView, Decoration, type DecorationSet, WidgetType} from '@codemirror/view';
import {StateField, EditorState} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import hljs from 'highlight.js';
import errorImageGeneric from '@/assets/error-image-generic.png';

const hiddenMarkdown = Decoration.mark({class: 'cm-hidden-markdown'});
const visibleMarkdown = Decoration.mark({class: 'cm-visible-markdown'});

class BlockWidget extends WidgetType {
    private static imageCache: Map<string, HTMLImageElement> = new Map();

    constructor(readonly content: string, readonly type: 'blockquote' | 'blockcode' | 'image', readonly language?: string, readonly alt?: string, readonly src?: string) {
        super();
    }

    toDOM() {
        const wrap = document.createElement("div");
        wrap.className = `cm-${this.type}-widget`;
        const lines = this.content.split('\n');
        const processedLines = lines.map(line => {
            return this.type === 'blockquote' ? line.replace(/^>\s?/, '') : line;
        });
        if (this.type === 'blockcode') {
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            if (this.language) {
                code.className = `language-${this.language}`;
                wrap.setAttribute('data-language', this.language);
            }
            code.textContent = processedLines.join('\n');
            if (this.language) {
                hljs.highlightElement(code);
            }
            pre.appendChild(code);
            wrap.appendChild(pre);
        } else if (this.type === 'image') {
            if (this.src) {
                let img: HTMLImageElement;
                if (BlockWidget.imageCache.has(this.src)) {
                    img = BlockWidget.imageCache.get(this.src)!.cloneNode() as HTMLImageElement;
                } else {
                    img = document.createElement("img");
                    img.src = this.src;
                    img.alt = this.alt || '';
                    img.onload = () => {
                        BlockWidget.imageCache.set(this.src!, img);
                    };
                    img.onerror = () => {
                        console.error(`Failed to load image: ${this.src}`);
                        img.src = errorImageGeneric;
                        img.alt = 'Failed to load image';
                        BlockWidget.imageCache.set(this.src!, img);
                    }
                }
                wrap.appendChild(img);
            }

            if (this.alt) {
                const caption = document.createElement("div");
                caption.className = 'cm-image-caption';
                caption.textContent = this.alt;
                wrap.appendChild(caption);
            }
        } else {
            wrap.textContent = processedLines.join('\n');
        }
        return wrap;
    }

    ignoreEvent() {
        return false;
    }

    eq(other: BlockWidget) {
        return this.content === other.content && this.type === other.type && this.language === other.language && this.alt === other.alt && this.src === other.src;
    }
}

const markdownSyntaxHidingField = StateField.define<DecorationSet>({
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
                    ['Emphasis', 'StrongEmphasis', 'InlineCode', 'FencedCode', 'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'Blockquote', 'Link', 'Image'].includes(node.type.name)
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

export function markdownSyntaxHiding() {
    console.log('markdownSyntaxHiding');


    return [
        markdownSyntaxHidingField,
        EditorView.baseTheme({
            '.cm-hidden-markdown': {display: 'none'},
            '.cm-visible-markdown': {color: 'darkgray'},
            '.cm-blockquote-widget, .cm-blockcode-widget': {
                display: 'block',
                width: '100%',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '4px 0',
                lineHeight: '1.2',
                whiteSpace: 'pre-wrap',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: 'inherit',
            },
            '.cm-blockquote-widget': {
                background: '#f9f9f9',
            },
            '.cm-blockcode-widget': {
                fontFamily: 'monospace',
                background: '#282c34',
                color: '#abb2bf', // 设置默认文本颜色
            },
            '.cm-blockcode-widget pre': {
                margin: 0,
                padding: 0,
            },
            '.cm-blockcode-widget code': {
                display: 'block',
                padding: '1em',
                overflow: 'auto',
            },
            '.cm-blockcode-widget .hljs': {
                display: 'block',
                'overflow-x': 'auto',
                padding: '1em',
            },
            '.cm-blockcode-widget .hljs-comment, .cm-blockcode-widget .hljs-quote': {
                color: '#5c6370',
                fontStyle: 'italic',
            },
            '.cm-blockcode-widget .hljs-doctag, .cm-blockcode-widget .hljs-keyword, .cm-blockcode-widget .hljs-formula': {
                color: '#c678dd',
            },
            '.cm-blockcode-widget .hljs-section, .cm-blockcode-widget .hljs-name, .cm-blockcode-widget .hljs-selector-tag, .cm-blockcode-widget .hljs-deletion, .cm-blockcode-widget .hljs-subst': {
                color: '#e06c75',
            },
            '.cm-blockcode-widget .hljs-literal': {
                color: '#56b6c2',
            },
            '.cm-blockcode-widget .hljs-string, .cm-blockcode-widget .hljs-regexp, .cm-blockcode-widget .hljs-addition, .cm-blockcode-widget .hljs-attribute, .cm-blockcode-widget .hljs-meta-string': {
                color: '#98c379',
            },
            '.cm-blockcode-widget .hljs-built_in, .cm-blockcode-widget .hljs-class .cm-blockcode-widget .hljs-title': {
                color: '#e6c07b',
            },
            '.cm-inline-code-widget': {
                fontFamily: 'monospace',
                background: '#f0f0f0',
                padding: '2px 4px',
                borderRadius: '3px',
                display: 'inline-block',
            },
            '.cm-link-widget': {
                textDecoration: 'underline',
                color: 'lightblue',
            },
            '.cm-widgetBuffer': {
                display: 'none !important',
            },
            '.cm-image-widget': {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '100%',
                margin: '4px 0',
            },
            '.cm-image-widget img': {
                maxWidth: '100%',
                height: 'auto',
            },
            '.cm-image-caption': {
                textAlign: 'center',
                color: '#777',
                fontSize: '0.9em',
                marginTop: '4px',
            },
        }),
    ];
}

class RangeSetBuilder<T extends Decoration> {
    private ranges: { from: number; to: number; value: T }[] = [];

    add(from: number, to: number, value: T) {
        this.ranges.push({from, to, value});
    }

    finish(): DecorationSet {
        return Decoration.set(this.ranges.map(({from, to, value}) => value.range(from, to)));
    }
}