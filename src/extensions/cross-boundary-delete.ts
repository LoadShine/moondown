/**
 * Cross-Boundary Delete Extension
 *
 * Fixes Bug 1 (P1): When a user selects across a widget boundary (e.g., from
 * inside a Table to outside it), pressing Backspace/Delete should delete the
 * entire selection consistently, including full widget nodes that are partially
 * covered by the selection.
 *
 * Two-layer strategy:
 * 1. Check CM's state selection and expand across widget boundaries.
 * 2. If CM's selection is empty/doesn't help, fall back to the native DOM
 *    selection (window.getSelection) and use view.posAtDOM() to convert
 *    browser-level selection endpoints to document positions. This handles
 *    the case where a table widget's `ignoreEvent: true` prevents CM from
 *    capturing the cross-boundary selection.
 */

import { EditorView, keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

/** Syntax node names that are rendered as replacement widgets. */
const WIDGET_NODE_NAMES = new Set(['Table', 'FencedCode']);

/**
 * Expands a [from, to] range so that any widget node (Table, FencedCode)
 * that overlaps with the range is fully included.
 * Returns the expanded range, or null if nothing changed.
 */
function expandAcrossWidgets(
    view: EditorView,
    selFrom: number,
    selTo: number
): { from: number; to: number } | null {
    if (selFrom === selTo) return null;

    let expandedFrom = selFrom;
    let expandedTo = selTo;
    let didExpand = false;

    syntaxTree(view.state).iterate({
        from: selFrom,
        to: selTo,
        enter: (node) => {
            if (!WIDGET_NODE_NAMES.has(node.name)) return;

            const overlapsStart = selFrom > node.from && selFrom < node.to;
            const overlapsEnd = selTo > node.from && selTo < node.to;
            const fullyContained = selFrom <= node.from && selTo >= node.to;

            if (overlapsStart || overlapsEnd || fullyContained) {
                expandedFrom = Math.min(expandedFrom, node.from);
                expandedTo = Math.max(expandedTo, node.to);
                didExpand = true;
            }
        },
    });

    return didExpand ? { from: expandedFrom, to: expandedTo } : null;
}

/**
 * Resolves the effective deletion range from the native DOM selection.
 *
 * When a table widget uses `ignoreEvent: true`, CM's state selection doesn't
 * capture the full cross-boundary extent. The browser's native Selection API
 * does reflect the visual selection, so we convert its endpoints to CM
 * document positions via `view.posAtDOM()`.
 */
function resolveNativeDeletionRange(
    view: EditorView
): { from: number; to: number } | null {
    const nativeSel = window.getSelection();
    if (!nativeSel || nativeSel.isCollapsed || nativeSel.rangeCount === 0) {
        return null;
    }

    const range = nativeSel.getRangeAt(0);

    let startPos: number;
    let endPos: number;
    try {
        startPos = view.posAtDOM(range.startContainer, range.startOffset);
        endPos = view.posAtDOM(range.endContainer, range.endOffset);
    } catch {
        // posAtDOM throws if the node is not part of the editor DOM tree
        return null;
    }

    if (startPos === endPos) return null;

    const from = Math.min(startPos, endPos);
    const to = Math.max(startPos, endPos);

    // Clamp to document bounds
    const docLen = view.state.doc.length;
    return {
        from: Math.max(0, Math.min(from, docLen)),
        to: Math.max(0, Math.min(to, docLen)),
    };
}

/**
 * Handles cross-boundary deletion:
 * 1. Try CM state selection first.
 * 2. Fall back to native DOM selection if CM doesn't detect cross-boundary.
 * 3. Expand across any overlapping widget nodes.
 * 4. Dispatch a single clean deletion.
 */
function handleCrossBoundaryDelete(view: EditorView): boolean {
    const { from: cmFrom, to: cmTo } = view.state.selection.main;

    // --- Layer 1: CM state selection ---
    if (cmFrom !== cmTo) {
        const expanded = expandAcrossWidgets(view, cmFrom, cmTo);
        if (expanded) {
            view.dispatch({
                changes: { from: expanded.from, to: expanded.to, insert: '' },
                selection: EditorSelection.cursor(expanded.from),
            });
            return true;
        }
    }

    // --- Layer 2: Native DOM selection (handles table ignoreEvent: true) ---
    const nativeRange = resolveNativeDeletionRange(view);
    if (!nativeRange || nativeRange.from === nativeRange.to) {
        return false;
    }

    // Merge CM selection with native selection for maximum coverage
    const mergedFrom = cmFrom !== cmTo
        ? Math.min(cmFrom, nativeRange.from)
        : nativeRange.from;
    const mergedTo = cmFrom !== cmTo
        ? Math.max(cmTo, nativeRange.to)
        : nativeRange.to;

    if (mergedFrom === mergedTo) return false;

    // Expand across any widget nodes in the merged range
    const expanded = expandAcrossWidgets(view, mergedFrom, mergedTo);
    const finalFrom = expanded ? expanded.from : mergedFrom;
    const finalTo = expanded ? expanded.to : mergedTo;

    if (finalFrom === finalTo) return false;

    // Clear the native selection first to prevent browser's default action
    // from also modifying contentEditable cells
    window.getSelection()?.removeAllRanges();

    view.dispatch({
        changes: { from: finalFrom, to: finalTo, insert: '' },
        selection: EditorSelection.cursor(finalFrom),
    });

    return true;
}

/**
 * Keymap extension: intercepts Backspace/Delete for cross-boundary handling.
 */
export const crossBoundaryDeleteKeymap = keymap.of([
    {
        key: 'Backspace',
        run: handleCrossBoundaryDelete,
    },
    {
        key: 'Delete',
        run: handleCrossBoundaryDelete,
    },
]);
