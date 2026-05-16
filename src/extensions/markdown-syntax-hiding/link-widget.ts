import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { addHighlightEffect } from "./highlight-effects";
import { escapeRegExp } from "../../core";

/**
 * A CodeMirror Widget that renders a styled, clickable link in place of
 * the full markdown syntax `[text](url)` or `[text][ref]`.
 */
export class LinkWidget extends WidgetType {
    constructor(
        private displayText: string,
        private fullLink: string,
        private start: number,
        private refId?: string
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement("span");
        span.className = "cm-link-widget";
        span.textContent = this.displayText;

        span.addEventListener('mousedown', (event) => {
            event.preventDefault();

            // If it's a reference link, find and jump to its definition.
            if (this.refId) {
                const docText = view.state.doc.toString();
                // A definition must be at the start of a line.
                const defPattern = new RegExp(`^\\[${escapeRegExp(this.refId)}\\]:`, 'm');
                const match = defPattern.exec(docText);

                if (match) {
                    const defPos = match.index;
                    const line = view.state.doc.lineAt(defPos);
                    const targetEnd = line.to;

                    // Move cursor, scroll, and temporarily highlight the definition.
                    view.dispatch({
                        selection: EditorSelection.cursor(targetEnd),
                        effects: [
                            EditorView.scrollIntoView(targetEnd, { y: "center" }),
                            addHighlightEffect.of({ from: line.from, to: targetEnd, timestamp: Date.now() })
                        ]
                    });
                } else {
                    // Fallback: if definition is not found, just select the link usage.
                    const end = this.start + this.fullLink.length;
                    view.dispatch({
                        selection: EditorSelection.single(this.start, end)
                    });
                }
            } else {
                // For regular inline links, select the markdown text.
                const end = this.start + this.fullLink.length;
                view.dispatch({
                    selection: EditorSelection.single(this.start, end)
                });
            }
        });

        return span;
    }

    eq(other: LinkWidget) {
        return other.displayText === this.displayText &&
            other.fullLink === this.fullLink &&
            other.start === this.start &&
            other.refId === this.refId;
    }

    ignoreEvent(event: Event): boolean {
        // Intercept mousedown to handle selection and jumping.
        return event.type === 'mousedown';
    }
}