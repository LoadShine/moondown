import {markdownSyntaxHidingField, syntaxHidingState} from './markdown-syntax-hiding-field';
import {highlightCleanupPlugin, referenceHighlightField} from "./highlight-effects";

/**
 * Returns a CodeMirror extension that provides markdown syntax hiding.
 * This creates a more WYSIWYG-like editing experience by visually collapsing
 * markdown markers (e.g., `**`, `## `) when the cursor is not inside them.
 * It also includes effects for temporarily highlighting jumped-to definitions.
 */
export function markdownSyntaxHiding() {
    return [
        syntaxHidingState,
        markdownSyntaxHidingField,
        referenceHighlightField,
        highlightCleanupPlugin
    ];
}