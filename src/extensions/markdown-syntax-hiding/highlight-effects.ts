import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

/**
 * A StateEffect used to add a temporary highlight to a range of text.
 * This is primarily for providing visual feedback when jumping to a link or footnote definition.
 */
export const addHighlightEffect = StateEffect.define<{from: number, to: number, timestamp: number}>();

export interface HighlightInfo {
    from: number;
    to: number;
    timestamp: number;
}

/**
 * A StateField to manage the temporary highlight decoration.
 * It holds information about the highlighted range and its start time,
 * automatically clearing the highlight after a set duration.
 */
export const referenceHighlightField = StateField.define<HighlightInfo | null>({
    create() {
        return null;
    },
    update(highlight, tr) {
        // Apply new highlight effect
        for (const effect of tr.effects) {
            if (effect.is(addHighlightEffect)) {
                return effect.value;
            }
        }

        if (highlight) {
            // Check if the highlight has expired
            const elapsed = Date.now() - highlight.timestamp;
            if (elapsed >= 2000) {
                return null;
            }
        }
        if (highlight && tr.docChanged) {
            return {
                from: tr.changes.mapPos(highlight.from),
                to: tr.changes.mapPos(highlight.to),
                timestamp: highlight.timestamp
            };
        }
        return highlight;
    },
    provide: f => EditorView.decorations.from(f, highlight => {
        if (!highlight) return Decoration.none;
        const elapsed = Date.now() - highlight.timestamp;
        if (elapsed >= 2000) {
            return Decoration.none;
        }
        const deco = Decoration.mark({
            class: "cm-reference-highlight"
        }).range(highlight.from, highlight.to);
        return Decoration.set([deco]);
    })
});

/**
 * A ViewPlugin that ensures the expired highlight decoration is removed from the view.
 * It dispatches an empty transaction to trigger a view update if the highlight has just expired.
 */
export const highlightCleanupPlugin = EditorView.updateListener.of((update) => {
    const highlight = update.state.field(referenceHighlightField, false);
    if (highlight) {
        const elapsed = Date.now() - highlight.timestamp;
        // If the highlight has just expired, trigger a redraw.
        if (elapsed >= 2000 && elapsed < 2100) {
            setTimeout(() => {
                // Check if the highlight still exists before dispatching
                if (update.view.state.field(referenceHighlightField, false)) {
                    update.view.dispatch({});
                }
            }, 100);
        }
    }
});