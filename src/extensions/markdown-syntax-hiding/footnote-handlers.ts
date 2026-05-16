import { EditorSelection } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { CSS_CLASSES, escapeRegExp } from '../../core';
import { addHighlightEffect } from './highlight-effects';
import type { DecorationItem, HandlerContext } from './types';

const visibleMarkdown = Decoration.mark({ class: CSS_CLASSES.VISIBLE_MARKDOWN });

/**
 * Widget for footnote references (like [^1])
 */
export class FootnoteWidget extends WidgetType {
    constructor(
        private footnoteId: string,
        private fullText: string,
        private start: number
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const sup = document.createElement('sup');
        sup.className = 'cm-footnote-widget';
        sup.textContent = this.footnoteId;

        sup.addEventListener('mousedown', (event) => {
            event.preventDefault();

            // Find the footnote definition in the document
            const docText = view.state.doc.toString();
            const defPattern = new RegExp(`^\\[\\^${escapeRegExp(this.footnoteId)}\\]:`, 'm');
            const match = defPattern.exec(docText);

            if (match) {
                const defPos = match.index;
                const line = view.state.doc.lineAt(defPos);
                const targetEnd = line.to;

                view.dispatch({
                    selection: EditorSelection.cursor(targetEnd),
                    effects: [
                        EditorView.scrollIntoView(targetEnd, { y: 'center' }),
                        addHighlightEffect.of({ from: line.from, to: targetEnd, timestamp: Date.now() }),
                    ],
                });
            } else {
                // Fallback: select the footnote reference
                const end = this.start + this.fullText.length;
                view.dispatch({
                    selection: EditorSelection.single(this.start, end),
                });
            }
        });

        return sup;
    }

    eq(other: FootnoteWidget): boolean {
        return (
            other.footnoteId === this.footnoteId &&
            other.fullText === this.fullText &&
            other.start === this.start
        );
    }

    ignoreEvent(event: Event): boolean {
        return event.type === 'mousedown';
    }
}

/**
 * Widget for footnote definitions (the [^id]: content part)
 */
export class FootnoteDefinitionWidget extends WidgetType {
    constructor(
        private footnoteId: string,
        private content: string,
        private fullText: string,
        private start: number
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.className = 'cm-footnote-definition-widget';

        // Create the footnote ID part
        const idSpan = document.createElement('span');
        idSpan.textContent = this.footnoteId;
        idSpan.style.fontWeight = '600';

        // Create the content part
        const contentSpan = document.createElement('span');
        contentSpan.style.marginLeft = '8px';
        contentSpan.textContent = this.content;

        container.appendChild(idSpan);
        container.appendChild(contentSpan);

        // Set title for hover
        container.title = `Jump to footnote reference: ${this.footnoteId}`;

        container.addEventListener('mousedown', (event) => {
            event.preventDefault();

            // Find the footnote reference in the document
            const docText = view.state.doc.toString();
            const refPattern = new RegExp(`\\[\\^${escapeRegExp(this.footnoteId)}\\]`, 'g');
            const match = refPattern.exec(docText);

            if (match) {
                const targetPos = match.index;
                const targetEnd = targetPos + match[0].length;

                view.dispatch({
                    selection: EditorSelection.cursor(targetEnd),
                    effects: [
                        EditorView.scrollIntoView(targetEnd, { y: 'center' }),
                        addHighlightEffect.of({ from: targetPos, to: targetEnd, timestamp: Date.now() }),
                    ],
                });
            }
        });

        // Allow double-click to select the definition itself
        container.addEventListener('click', (event) => {
            if (event.detail === 2) {
                event.preventDefault();
                const end = this.start + this.fullText.length;
                view.dispatch({
                    selection: EditorSelection.single(this.start, end),
                });
            }
        });

        return container;
    }

    eq(other: FootnoteDefinitionWidget): boolean {
        return (
            other.footnoteId === this.footnoteId &&
            other.content === this.content &&
            other.fullText === this.fullText &&
            other.start === this.start
        );
    }

    ignoreEvent(event: Event): boolean {
        return event.type === 'mousedown' || event.type === 'click';
    }
}

/**
 * Handles footnote references like [^1]
 */
export function handleFootnote(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const footnoteText = state.doc.sliceString(start, end);
    const footnoteMatch = footnoteText.match(/^\[\^([^\]]+)\]$/);

    if (!footnoteMatch) return [];

    const footnoteId = footnoteMatch[1];

    if (!isSelected) {
        return [
            {
                from: start,
                to: end,
                decoration: Decoration.replace({
                    widget: new FootnoteWidget(footnoteId, footnoteText, start),
                    inclusive: true,
                }),
            },
        ];
    }

    return [
        {
            from: start,
            to: end,
            decoration: visibleMarkdown,
        },
    ];
}

/**
 * Handles footnote definition lines: [^id]: content
 */
export function handleFootnoteDefinition(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const line = state.doc.lineAt(start);
    const lineText = line.text;

    // Match footnote definition: [^id]: content
    const match = lineText.match(/^\[\^([^\]]+)\]:\s*(.*)/);

    if (!match) return [];

    const footnoteId = match[1];
    const content = match[2];
    const fullText = lineText;

    const decorations: DecorationItem[] = [];

    // Add line decoration for visual distinction
    decorations.push({
        from: line.from,
        to: line.from,
        decoration: Decoration.line({
            class: 'cm-footnote-definition-line',
        }),
    });

    if (!isSelected) {
        // Replace the entire line with a nicely styled widget
        return [
            ...decorations,
            {
                from: start,
                to: end,
                decoration: Decoration.replace({
                    widget: new FootnoteDefinitionWidget(footnoteId, content, fullText, start),
                    inclusive: true,
                }),
            },
        ];
    }

    // When selected, show syntax with highlighting
    const colonPos = line.from + lineText.indexOf(':');
    const contentMatch = lineText.slice(lineText.indexOf(':') + 1).match(/\s*(.*)/);

    if (contentMatch) {
        const contentStartOffset = lineText.indexOf(':', lineText.indexOf(']')) + 1;
        const contentEnd = line.to;

        decorations.push(
            // Highlight the [^id]: part
            {
                from: line.from,
                to: colonPos + 1,
                decoration: Decoration.mark({
                    class: 'cm-visible-markdown',
                }),
            },
            // Style the content part
            {
                from: line.from + contentStartOffset,
                to: contentEnd,
                decoration: Decoration.mark({
                    class: 'cm-footnote-definition-content',
                }),
            }
        );
    }

    return decorations;
}
