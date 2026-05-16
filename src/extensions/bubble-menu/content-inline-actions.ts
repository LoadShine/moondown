import { type ChangeSpec, type EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { applyChanges, escapeRegExp, getTextWithContext, SELECTION } from '../../core';

/**
 * Toggles an inline markdown style (e.g., bold, italic) around the current selection.
 */
export function toggleInlineStyle(view: EditorView, mark: string): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get text with context around the selection to find surrounding markers.
    const contextLength = mark.length * SELECTION.MARKER_CONTEXT_LENGTH;
    const { text: textToCheck, start } = getTextWithContext(state, from, to, contextLength);

    const escapedMark = escapeRegExp(mark);
    const regex = new RegExp(`(${escapedMark}+)([\\s\\S]*?)\\1`, 'g');

    const markerLength = mark.length;
    const changes: ChangeSpec[] = [];
    let match: RegExpExecArray | null;
    let found = false;

    // Check special case of bold/italic conversions.
    if (mark === '*') {
        const boldOrBoldItalicRegex = /(\*{2,3})([^*]+)\1/g;
        while ((match = boldOrBoldItalicRegex.exec(textToCheck)) !== null) {
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;
            if (matchStart <= from && to <= matchEnd) {
                const existingMarkers = match[1];
                if (existingMarkers === '**') {
                    // Convert bold to bold-italic.
                    changes.push(
                        { from: matchStart, to: matchStart + 2, insert: '***' },
                        { from: matchEnd - 2, to: matchEnd, insert: '***' }
                    );
                } else if (existingMarkers === '***') {
                    // Convert bold-italic to bold.
                    changes.push(
                        { from: matchStart, to: matchStart + 3, insert: '**' },
                        { from: matchEnd - 3, to: matchEnd, insert: '**' }
                    );
                }
                found = true;
                break;
            }
        }
    }

    if (!found) {
        while ((match = regex.exec(textToCheck)) !== null) {
            const fullMarkerLength = match[1].length;
            if (fullMarkerLength % markerLength !== 0) {
                continue;
            }
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;

            if (matchStart <= from && to <= matchEnd) {
                // Remove one layer of markers.
                changes.push(
                    { from: matchStart, to: matchStart + markerLength, insert: '' },
                    { from: matchEnd - markerLength, to: matchEnd, insert: '' }
                );
                found = true;
                break;
            }
        }
    }

    // If no existing style was found to remove, handle combined style cases.
    if (!found) {
        const combinedRegex = /(\*{1,3}|_{1,3}|~~|==)([^*_~=]+)\1/g;
        while ((match = combinedRegex.exec(textToCheck)) !== null) {
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;

            if (matchStart <= from && to <= matchEnd) {
                const existingMarkers = match[1];
                if (existingMarkers.includes(mark)) {
                    // Remove the mark from existing markers.
                    const newMarkers = existingMarkers.replace(mark, '');
                    changes.push(
                        { from: matchStart, to: matchStart + existingMarkers.length, insert: newMarkers },
                        { from: matchEnd - existingMarkers.length, to: matchEnd, insert: newMarkers }
                    );
                } else {
                    // Add the mark to existing markers.
                    changes.push(
                        { from: matchStart, to: matchStart + existingMarkers.length, insert: existingMarkers + mark },
                        { from: matchEnd - existingMarkers.length, to: matchEnd, insert: mark + existingMarkers }
                    );
                }
                found = true;
                break;
            }
        }
    }

    if (!found) {
        // Add new markers.
        changes.push(
            { from, insert: mark },
            { from: to, insert: mark }
        );
    }

    applyChanges(view, changes);
    return true;
}

/**
 * Checks if an inline style is active within the current selection.
 */
export function isInlineStyleActive(state: EditorState, marker: string): boolean {
    const { from, to } = state.selection.main;

    const contextLength = marker.length * SELECTION.MARKER_CONTEXT_LENGTH;
    const { text: textToCheck, start } = getTextWithContext(state, from, to, contextLength);

    const escapedMarker = escapeRegExp(marker);
    // Regex to find a valid markdown style block.
    const regex = new RegExp(
        `(?<!\\${marker[0]})${escapedMarker}([^${escapedMarker}]+)${escapedMarker}(?!\\${marker[0]})`,
        'g'
    );

    let match: RegExpExecArray | null;
    while ((match = regex.exec(textToCheck)) !== null) {
        const matchStart = start + match.index;
        const matchEnd = matchStart + match[0].length;

        if (matchStart <= from && to <= matchEnd) {
            return true;
        }
    }

    // Special handling for combined bold/italic styles.
    if (marker === '**' || marker === '*') {
        const boldItalicRegex = /\*{3}([^*]+)\*{3}/g;
        while ((match = boldItalicRegex.exec(textToCheck)) !== null) {
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;

            if (matchStart <= from && to <= matchEnd) {
                return true;
            }
        }
    }

    return false;
}
