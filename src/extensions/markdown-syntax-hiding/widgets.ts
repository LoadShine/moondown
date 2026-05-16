import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

/**
 * An abstract base class for inline style widgets (like code, strikethrough, etc.).
 * It provides common functionality for rendering styled content and handling clicks
 * to reveal the underlying markdown syntax by selecting it.
 */
abstract class SelectableInlineWidget extends WidgetType {
    constructor(
        protected content: string,
        protected fullText: string,
        protected start: number,
        protected className: string
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement("span");
        span.className = this.className;
        span.textContent = this.content;

        // When the widget is clicked, select the full markdown text.
        span.addEventListener('mousedown', (event) => {
            event.preventDefault();
            const end = this.start + this.fullText.length;
            view.dispatch({
                selection: EditorSelection.single(this.start, end)
            });
        });

        return span;
    }

    eq(other: SelectableInlineWidget): boolean {
        return (
            other.content === this.content &&
            other.fullText === this.fullText &&
            other.start === this.start &&
            other.className === this.className
        );
    }

    ignoreEvent(event: Event): boolean {
        // Intercept mousedown events to handle the custom selection behavior.
        return event.type === 'mousedown';
    }
}

/**
 * Widget for rendering inline code (`code`).
 */
export class InlineCodeWidget extends SelectableInlineWidget {
    constructor(content: string, fullText: string, start: number) {
        super(content, fullText, start, "cm-inline-code-widget");
    }
}

/**
 * Widget for rendering strikethrough text (~~text~~).
 */
export class StrikethroughWidget extends SelectableInlineWidget {
    constructor(content: string, fullText: string, start: number) {
        super(content, fullText, start, "cm-strikethrough-widget");
    }
}

/**
 * Widget for rendering highlighted text (==text==).
 */
export class HighlightWidget extends SelectableInlineWidget {
    constructor(content: string, fullText: string, start: number) {
        super(content, fullText, start, "cm-highlight-widget");
    }
}

/**
 * Widget for rendering underlined text (~text~).
 */
export class UnderlineWidget extends SelectableInlineWidget {
    constructor(content: string, fullText: string, start: number) {
        super(content, fullText, start, "cm-underline-widget");
    }
}