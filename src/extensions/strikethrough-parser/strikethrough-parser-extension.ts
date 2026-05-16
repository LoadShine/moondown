/**
 * A Lezer markdown parser extension for `~~strikethrough~~` syntax.
 * This is a common extension supported by GFM and other markdown flavors.
 */
import {InlineContext, type MarkdownExtension} from "@lezer/markdown";

/**
 * Delimiter configuration for strikethrough parsing.
 * Defines how the parser should handle `~~` markers.
 */
export const StrikethroughDelim = { resolve: "Strikethrough", mark: "StrikethroughMarker" };

/**
 * The MarkdownExtension object for strikethrough formatting.
 * It defines the new AST nodes and the inline parsing logic.
 */
export const StrikethroughExtension: MarkdownExtension = {
    defineNodes: ["Strikethrough", "StrikethroughMarker"],
    parseInline: [
        {
            name: "Strikethrough",
            parse(cx: InlineContext, next: number, pos: number) {
                // 126 is the ASCII code for '~'. Check for `~~`.
                if (next != 126 || cx.char(pos + 1) != 126) return -1;

                // Register a delimiter pair for strikethrough formatting.
                return cx.addDelimiter(StrikethroughDelim, pos, pos + 2, true, true);
            },
        },
    ],
};