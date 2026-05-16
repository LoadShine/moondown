import { EditorSelection } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { escapeRegExp } from '../../core';
import { addHighlightEffect } from './highlight-effects';
import type { DecorationItem, HandlerContext } from './types';

/**
 * Widget for link definitions (the [id]: url part)
 */
export class LinkDefinitionWidget extends WidgetType {
    constructor(
        private refId: string,
        private url: string,
        private fullText: string,
        private start: number
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.className = 'cm-link-definition-widget';

        // Create the reference ID part
        const refSpan = document.createElement('span');
        refSpan.textContent = this.refId;
        refSpan.style.fontWeight = '600';

        // Create a small URL preview (shortened if too long)
        const urlPreview = document.createElement('span');
        urlPreview.style.fontSize = '0.85em';
        urlPreview.style.opacity = '0.6';
        urlPreview.style.marginLeft = '8px';

        // Shorten URL for display
        let displayUrl = this.url;
        if (displayUrl.length > 40) {
            displayUrl = displayUrl.substring(0, 37) + '...';
        }
        urlPreview.textContent = `(${displayUrl})`;

        container.appendChild(refSpan);
        container.appendChild(urlPreview);

        // Set title for full URL on hover
        container.title = `Jump to reference: ${this.refId}\nURL: ${this.url}`;

        container.addEventListener('mousedown', (event) => {
            event.preventDefault();

            // Find the reference usage in the document
            const docText = view.state.doc.toString();
            const refPattern = new RegExp(`\\[([^\\]]+)\\]\\[${escapeRegExp(this.refId)}\\]`, 'gi');
            const match = refPattern.exec(docText);

            if (match) {
                const targetPos = match.index;
                const targetEnd = targetPos + match[0].length;

                // Move cursor to the END of the reference (not select it)
                view.dispatch({
                    selection: EditorSelection.cursor(targetEnd),
                    effects: [
                        EditorView.scrollIntoView(targetEnd, { y: 'center' }),
                        // Add a special effect to mark this as a programmatic jump
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

    eq(other: LinkDefinitionWidget): boolean {
        return (
            other.refId === this.refId &&
            other.url === this.url &&
            other.fullText === this.fullText &&
            other.start === this.start
        );
    }

    ignoreEvent(event: Event): boolean {
        return event.type === 'mousedown' || event.type === 'click';
    }
}

/**
 * Handles link definition lines: [id]: url
 */
export function handleLinkDefinition(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const line = state.doc.lineAt(start);
    const lineText = line.text;

    // Match link definition: [ref-id]: url (optional "title")
    const match = lineText.match(/^\[([^\]]+)\]:\s*(\S+)(?:\s+"([^"]*)")?/);

    if (!match) return [];

    const refId = match[1];
    const url = match[2];
    const fullText = lineText;

    const decorations: DecorationItem[] = [];

    // Add line decoration for visual distinction
    decorations.push({
        from: line.from,
        to: line.from,
        decoration: Decoration.line({
            class: 'cm-link-definition-line',
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
                    widget: new LinkDefinitionWidget(refId, url, fullText, start),
                    inclusive: true,
                }),
            },
        ];
    }

    // When selected, show syntax with highlighting
    const colonPos = line.from + lineText.indexOf(':');
    const urlMatch = lineText.slice(lineText.indexOf(':') + 1).match(/\s*(\S+)/);

    if (urlMatch) {
        const urlStartOffset = lineText.indexOf(':', lineText.indexOf(']')) + 1 + urlMatch.index!;
        const urlEnd = line.from + urlStartOffset + urlMatch[1].length;

        decorations.push(
            // Highlight the [ref-id]: part
            {
                from: line.from,
                to: colonPos + 1,
                decoration: Decoration.mark({
                    class: 'cm-visible-markdown',
                }),
            },
            // Style the URL part
            {
                from: line.from + urlStartOffset,
                to: urlEnd,
                decoration: Decoration.mark({
                    class: 'cm-link-definition-url',
                }),
            }
        );
    }

    return decorations;
}
