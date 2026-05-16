import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

export interface TableRange {
    from: number;
    to: number;
}

const DOM_COORD_MATCH_THRESHOLD = 50;

function isDocumentRangeValid(state: EditorState, range: TableRange): boolean {
    return !(range.from < 0 || range.to > state.doc.length || range.from >= range.to);
}

export function isTableRangeValid(state: EditorState, range: TableRange): boolean {
    if (!isDocumentRangeValid(state, range)) {
        return false;
    }

    let isValid = false;
    syntaxTree(state).iterate({
        from: range.from,
        to: range.to,
        enter: (node) => {
            if (node.name === 'Table' && node.from === range.from && node.to === range.to) {
                isValid = true;
                return false;
            }
        },
    });

    return isValid;
}

export function collectTableRanges(state: EditorState): TableRange[] {
    const tableRanges: TableRange[] = [];
    syntaxTree(state).iterate({
        enter: (nodeRef) => {
            if (nodeRef.name === 'Table') {
                tableRanges.push({
                    from: nodeRef.from,
                    to: nodeRef.to,
                });
            }
        },
    });

    return tableRanges;
}

export function findTableRangeByDom(view: EditorView, tableDom: HTMLElement): TableRange | null {
    const tableRanges = collectTableRanges(view.state);
    if (tableRanges.length === 0) {
        return null;
    }

    if (tableRanges.length === 1) {
        return tableRanges[0];
    }

    const domRect = tableDom.getBoundingClientRect();
    for (const range of tableRanges) {
        const coords = view.coordsAtPos(range.from);
        if (!coords) {
            continue;
        }

        const distance = Math.abs(coords.top - domRect.top);
        if (distance < DOM_COORD_MATCH_THRESHOLD) {
            return range;
        }
    }

    return null;
}

export function isDocumentRangeInside(state: EditorState, range: TableRange): boolean {
    return isDocumentRangeValid(state, range);
}
