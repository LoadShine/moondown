import { WidgetType } from "@codemirror/view";

/**
 * A CodeMirror Widget that renders a custom bullet point for unordered lists.
 * This allows for different bullet styles based on the indentation level.
 */
export class BulletWidget extends WidgetType {
    constructor(private className: string, private level: number, private indentation: string) {
        super();
    }

    toDOM() {
        const span = document.createElement("span");
        const bulletSymbol = this.getBulletSymbol(this.level);
        // The HTML structure renders the indentation and a styled bullet symbol.
        span.innerHTML = `${this.indentation}<span class="bullet-symbol" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-weight: bold; transform: scale(0.6); display: inline-block;">${bulletSymbol}</span> `;
        span.className = `cm-bullet-list ${this.className}`;
        span.style.display = 'inline-block';
        return span;
    }

    /**
     * Determines the bullet symbol based on the indentation level.
     * Cycles through a predefined set of symbols.
     * @param level The indentation level (0-indexed).
     * @returns The character to use as the bullet point.
     */
    private getBulletSymbol(level: number): string {
        const symbols = [
            "●",  // Solid circle (Level 0)
            "○",  // Hollow circle (Level 1)
            "■",  // Solid square (Level 2)
            "□",  // Hollow square (Level 3)
            "▶",  // Triangle (Level 4)
            "▷"   // Hollow triangle (Level 5+)
        ];

        const symbolIndex = level % symbols.length;
        return symbols[symbolIndex];
    }

    eq(other: BulletWidget) {
        return other.className === this.className &&
            other.level === this.level &&
            other.indentation === this.indentation;
    }
}