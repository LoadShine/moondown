/**
 * A Lezer markdown parser extension for `==highlight==` (mark) syntax.
 * This is a common extension supported by GFM and other markdown flavors.
 */
import {InlineContext, type MarkdownExtension} from "@lezer/markdown";

/**
 * Delimiter configuration for mark (highlight) parsing.
 * Defines how the parser should handle `==` markers.
 */
export const MarkDelim = { resolve: "Mark", mark: "MarkMarker" };

/**
 * The MarkdownExtension object for mark/highlight formatting.
 * It defines the new AST nodes and the inline parsing logic.
 */
export const MarkExtension: MarkdownExtension = {
    defineNodes: ["Mark", "MarkMarker"],
    parseInline: [
        {
            name: "Mark",
            parse(cx: InlineContext, next: number, pos: number) {
                // 61 is the ASCII code for '='. Check for `==`.
                if (next != 61 || cx.char(pos + 1) != 61) return -1;

                // Register a delimiter pair for mark formatting.
                // The delimiter spans 2 characters (`==`).
                return cx.addDelimiter(MarkDelim, pos, pos + 2, true, true);
            },
        },
    ],
};