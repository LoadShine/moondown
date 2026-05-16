/**
 * A Lezer markdown parser extension for `~underline~` syntax.
 * This is a non-standard markdown feature but is included for enhanced formatting.
 */
import {InlineContext, type MarkdownExtension} from "@lezer/markdown";

/**
 * Delimiter configuration for underline parsing.
 * Defines how the parser should handle `~` markers.
 */
export const UnderlineDelim = {resolve: "Underline", mark: "UnderlineMarker"};

/**
 * The MarkdownExtension object for underline formatting.
 * It defines the new AST nodes and the inline parsing logic.
 */
export const UnderlineExtension: MarkdownExtension = {
    defineNodes: ["Underline", "UnderlineMarker"],
    parseInline: [
        {
            name: "Underline",
            parse(cx: InlineContext, next: number, pos: number) {
                // 126 is the ASCII code for '~'. Check for a single tilde.
                if (next != 126) return -1;
                // Ensure it's not part of a double tilde (strikethrough).
                if (cx.char(pos + 1) === 126) return -1;

                // Register a delimiter pair for underline formatting.
                return cx.addDelimiter(UnderlineDelim, pos, pos + 1, true, true);
            },
        },
    ],
};