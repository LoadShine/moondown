import type { EditorState } from '@codemirror/state';
import { createHeadingPrefix, extractListNumber, isUnorderedListItem } from '../../core';

/**
 * Checks if a specific heading level is active at the cursor's current line.
 */
export function isHeaderActive(state: EditorState, level: number): boolean {
    const { from } = state.selection.main;
    const line = state.doc.lineAt(from);
    const headerPrefix = createHeadingPrefix(level);
    return line.text.startsWith(headerPrefix);
}

/**
 * Checks if a list style is active at the cursor's current line.
 */
export function isListActive(state: EditorState, ordered: boolean): boolean {
    const { from } = state.selection.main;
    const line = state.doc.lineAt(from);

    if (ordered) {
        return extractListNumber(line.text) !== null;
    }

    return isUnorderedListItem(line.text);
}
