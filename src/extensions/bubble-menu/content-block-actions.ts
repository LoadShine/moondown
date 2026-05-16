import { type ChangeSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { applyChanges, createHeadingPrefix, extractListNumber, getLinesInRange, isUnorderedListItem } from '../../core';

/**
 * Sets or toggles the heading level for the selected lines.
 */
export function setHeader(view: EditorView, level: number): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;
    const headerPrefix = createHeadingPrefix(level);
    const lines = getLinesInRange(state, from, to);

    const changes: ChangeSpec[] = lines.map((line) => {
        // Toggle off if already this heading level.
        if (line.text.startsWith(headerPrefix)) {
            return {
                from: line.from,
                to: line.from + headerPrefix.length,
                insert: '',
            };
        }

        // Replace existing heading with new level.
        const existingHeaderMatch = line.text.match(/^#+\s/);
        if (existingHeaderMatch) {
            return {
                from: line.from,
                to: line.from + existingHeaderMatch[0].length,
                insert: headerPrefix,
            };
        }

        // Add new heading.
        return { from: line.from, insert: headerPrefix };
    });

    applyChanges(view, changes);
    return true;
}

/**
 * Toggles ordered or unordered list formatting for the selected lines.
 */
export function toggleList(view: EditorView, ordered: boolean): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;
    const lines = getLinesInRange(state, from, to);

    // Determine starting number for ordered lists.
    let currentNumber = 1;
    const fromLine = state.doc.lineAt(from);
    if (fromLine.number > 1 && ordered) {
        const prevLine = state.doc.line(fromLine.number - 1);
        const prevNumber = extractListNumber(prevLine.text);
        if (prevNumber !== null) {
            currentNumber = prevNumber + 1;
        }
    }

    const changes: ChangeSpec[] = lines.map((line) => {
        const lineText = line.text;

        if (ordered) {
            const existingNumber = extractListNumber(lineText);
            if (existingNumber !== null) {
                // Remove ordered list marker.
                const match = lineText.match(/^(\d+)\.\s/);
                return {
                    from: line.from,
                    to: line.from + match![0].length,
                    insert: '',
                };
            }
            // Add ordered list marker.
            const insert = `${currentNumber}. `;
            currentNumber += 1;
            return { from: line.from, insert };
        }

        if (isUnorderedListItem(lineText)) {
            // Remove unordered list marker.
            return { from: line.from, to: line.from + 2, insert: '' };
        }
        // Add unordered list marker.
        return { from: line.from, insert: '- ' };
    });

    applyChanges(view, changes);
    return true;
}
